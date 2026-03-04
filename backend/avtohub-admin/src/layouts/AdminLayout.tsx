import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck,
  Building2,
  Users,
  Package,
  Calendar,
  Star,
  DollarSign,
  FileText,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type MenuItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const ITEMS_ALL: MenuItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },

  // Только для super_admin
  { to: "/sto-requests", label: "Заявки STO", icon: FileCheck, adminOnly: true },
  { to: "/users", label: "Пользователи", icon: Users, adminOnly: true },
  { to: "/finance", label: "Финансы", icon: DollarSign, adminOnly: true },
  { to: "/logs", label: "Логи системы", icon: FileText, adminOnly: true },

  // Доступны всем ролям
  { to: "/stos", label: "Все STO", icon: Building2 },
  { to: "/services", label: "Каталог услуг", icon: Package },
  { to: "/bookings", label: "Все записи", icon: Calendar },
  { to: "/reviews", label: "Отзывы", icon: Star },
];

export function AdminLayout() {
  const { logout, user } = useAuth();

  // ✅ правильная проверка роли
  const isAdmin = user?.role === "super_admin";

  // Показываем все пункты если super_admin
  const items = ITEMS_ALL.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-xl">
        <div className="border-b border-slate-800 p-6">
          <Link
            to="/dashboard"
            className="text-lg font-semibold text-white"
          >
            AvtoHub Admin
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-2 truncate px-4 text-xs text-slate-500">
            {user?.email}
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/20 hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Выйти
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-6 pt-8 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}