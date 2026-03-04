import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, MapPin, Bell, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCity } from "../../context/CityContext";
import { getNotifications, markAllNotificationsRead } from "../../api/notifications";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ id: number; title: string; is_read: boolean }[]>([]);
  const { isAuthenticated, user, logout } = useAuth();
  const { selectedCityId, selectedCityName } = useCity();
  const navigate = useNavigate();

  const handleCityClick = () => {
    setMobileOpen(false);
  };

  const handleFindStoClick = () => {
    setMobileOpen(false);
    if (selectedCityId) {
      navigate(`/sto?city_id=${selectedCityId}`);
    } else {
      navigate("/select-city");
    }
  };

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(() => {
    if (!isAuthenticated) return;
    getNotifications().then((n) => setNotifs(n.slice(0, 5))).catch(() => {});
  }, [isAuthenticated]);

  const fetchUnreadCount = useCallback(() => {
    if (!isAuthenticated) return;
    import("../../api/notifications")
      .then(({ getNotificationsUnreadCount }) => getNotificationsUnreadCount())
      .then(setUnreadCount)
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (notifOpen) {
      fetchNotifs();
      markAllNotificationsRead().then(() => fetchUnreadCount()).catch(() => {});
    }
  }, [notifOpen, fetchNotifs, fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (notifOpen) fetchUnreadCount();
  }, [notifOpen, fetchUnreadCount]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="text-xl font-semibold text-white"
          >
            AvtoHub KZ
          </Link>
          <button
            type="button"
            onClick={() => navigate(selectedCityId ? `/sto?city_id=${selectedCityId}` : "/select-city")}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20"
          >
            <Search className="h-4 w-4" />
            Найти СТО
          </button>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {selectedCityId && selectedCityName ? (
            <Link
              to="/select-city"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <MapPin className="h-4 w-4" />
              {selectedCityName}
            </Link>
          ) : (
            <Link
              to="/select-city"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <MapPin className="h-4 w-4" />
              Выбрать город
            </Link>
          )}
          {isAuthenticated && user ? (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Уведомления"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-w-[1rem] max-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        aria-hidden
                        onClick={() => setNotifOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-black/95 py-2 shadow-xl backdrop-blur-xl"
                      >
                        <div className="border-b border-white/5 px-4 py-2 text-sm font-medium text-white/80">
                          Уведомления
                        </div>
                        {notifs.length === 0 ? (
                          <p className="px-4 py-6 text-center text-sm text-white/50">
                            Нет уведомлений
                          </p>
                        ) : (
                          notifs.map((n) => (
                            <div
                              key={n.id}
                              className={`px-4 py-2 text-sm ${n.is_read ? "text-white/60" : "text-white"}`}
                            >
                              {n.title}
                            </div>
                          ))
                        )}
                        <Link
                          to="/dashboard"
                          onClick={() => setNotifOpen(false)}
                          className="block border-t border-white/5 px-4 py-2 text-center text-sm text-emerald-400 hover:underline"
                        >
                          В кабинет
                        </Link>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-emerald-400"
              >
                <User className="h-4 w-4" />
                {user?.email?.split("@")[0] ?? user?.email}
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-opacity hover:opacity-90"
            >
              Войти
            </Link>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 md:hidden"
          aria-label="Меню"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 bg-black/40 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4">
              <button
                type="button"
                onClick={handleFindStoClick}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left font-medium text-emerald-400 transition hover:bg-emerald-500/20"
              >
                <Search className="h-4 w-4" />
                Найти СТО
              </button>
              {selectedCityId && selectedCityName ? (
                <Link
                  to="/select-city"
                  onClick={handleCityClick}
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-left text-white transition hover:bg-white/10"
                >
                  <MapPin className="h-4 w-4" />
                  {selectedCityName}
                </Link>
              ) : (
                <Link
                  to="/select-city"
                  onClick={handleCityClick}
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-left text-white transition hover:bg-white/10"
                >
                  <MapPin className="h-4 w-4" />
                  Выбрать город
                </Link>
              )}
              {isAuthenticated && user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-white/90 transition-colors hover:bg-white/10"
                  >
                    {user?.email?.split("@")[0] ?? user?.email}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                      navigate("/");
                    }}
                    className="rounded-lg px-4 py-3 text-left text-red-400 transition-colors hover:bg-white/10"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-violet-500 px-4 py-3 text-center font-medium text-white"
                >
                  Войти
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
