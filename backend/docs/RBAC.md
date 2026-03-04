# Ролевой доступ (RBAC) — AvtoHub

## Роли

| Роль       | Значение   | Описание                                      |
|-----------|------------|------------------------------------------------|
| admin     | `admin`    | Полный доступ ко всей админ-панели             |
| sto_owner | `sto_owner`| Доступ только к своим СТО                      |
| user      | `client`   | Обычный пользователь, нет доступа к админке    |

---

## Backend: Depends и проверка роли

### 1. Depends(get_current_user)

Базовый dependency — возвращает текущего пользователя по JWT:

```python
# app/api/deps.py
async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> dict:
    """Require valid JWT. Returns user dict with id, email, role."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    # ...
    return {"id": user.id, "email": user.email, "role": user.role.value}
```

Использование в endpoint:

```python
@router.get("/profile")
async def profile(user: dict = Depends(get_current_user)):
    return {"email": user["email"], "role": user["role"]}
```

### 2. Проверка роли — require_role

Фабрика dependency для ограничения доступа по ролям:

```python
def require_role(*allowed_roles: str) -> Callable:
    async def _require_role(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise ForbiddenError(*Errors.FORBIDDEN)
        return user
    return _require_role

# Готовые зависимости:
require_admin = require_role("admin")
require_sto_owner = require_role("sto_owner", "sto")
require_client = require_role("client")
get_current_admin_or_sto_owner = require_role("admin", "sto_owner", "sto")
```

Пример:

```python
@router.get("/admin/stats")
async def get_stats(_user: dict = Depends(require_admin)):
    return await admin_svc.get_stats()
```

### 3. Admin или владелец СТО — require_admin_or_sto_owner_of_sto

Admin видит любой СТО, sto_owner — только свой:

```python
async def require_admin_or_sto_owner_of_sto(
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user),
    sto_repo: STORepository = Depends(get_sto_repository),
) -> dict:
    if user.get("role") == "admin":
        return user
    if user.get("role") not in ("sto_owner", "sto"):
        raise ForbiddenError(*Errors.FORBIDDEN)
    sto = await sto_repo.get_by_id(sto_id)
    if not sto or sto.owner_id != user["id"]:
        raise ForbiddenError(*Errors.FORBIDDEN)
    return user
```

Использование:

```python
@router.get("/admin/sto/{sto_id}/analytics")
async def get_sto_analytics(
    sto_id: int,
    _user: dict = Depends(require_admin_or_sto_owner_of_sto),
):
    return await admin_svc.get_sto_analytics(sto_id)
```

### 4. Условная логика по роли

```python
@router.get("/admin/stats")
async def get_admin_stats(
    user: dict = Depends(get_current_admin_or_sto_owner),
    admin_svc: AdminService = Depends(get_admin_service),
):
    if user.get("role") == "admin":
        return await admin_svc.get_stats()
    return await admin_svc.get_stats_for_owner(user["id"])
```

---

## Frontend: защита маршрутов

### AdminProtectedRoute

Проверяет роль при входе в админ-панель:

```tsx
// src/routes/AdminProtectedRoute.tsx
export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  // user (client) — нет доступа
  if (user.role === "client" || user.role === "user") {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
```

### AuthContext — проверка при логине

```tsx
const login = useCallback(async (email: string, password: string) => {
  const { access_token } = await apiLogin(email, password);
  setToken(access_token);
  const u = await getCurrentUser();
  if (!u || u.role === "client" || u.role === "user") {
    clearToken();
    throw new Error("Access denied. Admin or STO Owner role required.");
  }
  setUser(u);
}, []);
```

### Условный UI по роли

```tsx
const isAdmin = user?.role === "admin";

// Скрыть пункты меню для sto_owner
const items = ITEMS_ALL.filter((item) => !item.adminOnly || isAdmin);

// Показать график только админу
{user?.role === "admin" && <AnalyticsChart />}
```

---

## Сводка доступа

| Endpoint / Страница | admin | sto_owner | user |
|---------------------|-------|-----------|------|
| /admin/stats        | ✓     | ✓ (свои)  | ✗    |
| /admin/stos         | ✓     | ✓ (свои)  | ✗    |
| /admin/sto/{id}     | ✓     | ✓ (свой)  | ✗    |
| /admin/bookings     | ✓     | ✓ (свои)  | ✗    |
| /admin/reviews      | ✓     | ✓ (свои)  | ✗    |
| /admin/analytics    | ✓     | ✗         | ✗    |
| /admin/users        | ✓     | ✗         | ✗    |
| /admin/sto-requests | ✓     | ✗         | ✗    |
