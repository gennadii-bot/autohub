import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getNotifications,
  getNotificationsUnreadCount,
  markAllNotificationsRead,
} from "../api/notifications";

export function PartnerHeader() {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ id: number; title: string; is_read: boolean }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(() => {
    getNotifications().then((n) => setNotifs(n.slice(0, 5))).catch(() => {});
  }, []);

  const fetchUnreadCount = useCallback(() => {
    getNotificationsUnreadCount().then(setUnreadCount).catch(() => {});
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (notifOpen) {
      fetchNotifs();
      markAllNotificationsRead().then(() => fetchUnreadCount()).catch(() => {});
    }
  }, [notifOpen, fetchNotifs, fetchUnreadCount]);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 backdrop-blur-xl">
      <div className="text-lg font-semibold text-white">AvtoHub Партнёр</div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Уведомления"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-[1rem] max-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900 py-2 shadow-xl">
                  <div className="border-b border-slate-700 px-4 py-2 text-sm font-medium text-slate-300">
                    Уведомления
                  </div>
                  {notifs.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-500">
                      Нет уведомлений
                    </p>
                  ) : (
                    notifs.map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-2 text-sm ${n.is_read ? "text-slate-500" : "text-slate-200"}`}
                      >
                        {n.title}
                      </div>
                    ))
                  )}
              </div>
            </>
          )}
        </div>
        <span className="text-sm text-slate-400">{user?.email?.split("@")[0] ?? user?.email}</span>
      </div>
    </header>
  );
}
