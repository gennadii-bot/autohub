import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Calendar, User, LogOut, History, Heart, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getChatUnreadCount } from "../api/chat";

const SIDEBAR_LINKS = [
  { to: "/dashboard", icon: Home, label: "Главная" },
  { to: "/dashboard/bookings", icon: Calendar, label: "Мои записи" },
  { to: "/dashboard/history", icon: History, label: "История" },
  { to: "/dashboard/favorites", icon: Heart, label: "Избранное" },
  { to: "/dashboard/chat", icon: MessageCircle, label: "Чат", badge: true },
  { to: "/dashboard/profile", icon: User, label: "Профиль" },
];

const BOTTOM_LINKS = [
  { to: "/dashboard", icon: Home, label: "Главная" },
  { to: "/dashboard/bookings", icon: Calendar, label: "Записи" },
  { to: "/dashboard/history", icon: History, label: "История" },
  { to: "/dashboard/favorites", icon: Heart, label: "Избранное" },
  { to: "/dashboard/chat", icon: MessageCircle, label: "Чат" },
  { to: "/dashboard/profile", icon: User, label: "Профиль" },
] as const;

function NavItem({
  to,
  icon: Icon,
  label,
  onClick,
  badge,
  badgeCount,
}: {
  to?: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  badge?: boolean;
  badgeCount?: number;
}) {
  const content = (
    <span className="flex items-center gap-3">
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
      {badge && badgeCount !== undefined && badgeCount > 0 && (
        <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-white/70 transition-all duration-200 hover:bg-white/5 hover:text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]"
      >
        {content}
      </button>
    );
  }

  return (
    <NavLink
      to={to!}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
          isActive
            ? "bg-gradient-to-r from-emerald-500/20 to-violet-500/20 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)]"
            : "text-white/70 hover:bg-white/5 hover:text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]"
        }`
      }
    >
      {content}
    </NavLink>
  );
}

export function DashboardLayout() {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [chatUnread, setChatUnread] = useState(0);

  const fetchChatUnread = useCallback(() => {
    if (!isAuthenticated) return;
    getChatUnreadCount().then(setChatUnread).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 5000);
    return () => clearInterval(interval);
  }, [fetchChatUnread]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      {/* Sidebar — desktop (below header) */}
      <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-[260px] flex-col border-r border-white/5 bg-[#111827]/95 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-white/5 px-6">
          <span className="bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-xl font-bold text-transparent">
            AvtoHub KZ
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {SIDEBAR_LINKS.map((link) => (
            <NavItem
              key={link.to}
              to={link.to}
              icon={link.icon}
              label={link.label}
              badge={link.badge}
              badgeCount={link.badge ? chatUnread : undefined}
            />
          ))}
          <div className="pt-4">
            <NavItem icon={LogOut} label="Выйти" onClick={handleLogout} />
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="pb-24 pt-20 lg:pl-[260px] lg:pb-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-[#111827]/95 py-2 backdrop-blur-xl lg:hidden">
        {BOTTOM_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-200 ${
                isActive
                  ? "text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  : "text-white/60 hover:text-white/90"
              }`
            }
          >
            <link.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{link.label}</span>
            {link.to === "/dashboard/chat" && chatUnread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {chatUnread > 9 ? "9+" : chatUnread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
