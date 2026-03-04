import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Package,
  BarChart3,
  MessageCircle,
  User,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getChatUnreadCount } from "../api/partner";

const ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Записи", icon: Calendar },
  { to: "/services", label: "Услуги", icon: Package },
  { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  { to: "/chat", label: "Чат", icon: MessageCircle, badge: true },
  { to: "/profile", label: "Профиль", icon: User },
];

export function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [chatUnread, setChatUnread] = useState(0);

  const fetchChatUnread = useCallback(() => {
    getChatUnreadCount().then(setChatUnread).catch(() => {});
  }, []);

  useEffect(() => {
    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 5000);
    return () => clearInterval(interval);
  }, [fetchChatUnread]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-xl">
      <div className="border-b border-slate-800 p-6">
        <Link to="/dashboard" className="text-lg font-semibold text-white">
          AvtoHub Партнёр
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {ITEMS.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
            {badge && chatUnread > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {chatUnread > 9 ? "9+" : chatUnread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="mb-2 truncate px-4 text-xs text-slate-500">{user?.email}</div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
