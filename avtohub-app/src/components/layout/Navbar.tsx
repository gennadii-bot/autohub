import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-transparent backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="text-xl font-semibold text-white">
          AvtoHub KZ
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/city"
            className="text-sm font-medium text-white/80 hover:text-emerald-400 transition-colors"
          >
            Выбор города
          </Link>
          <Link
            to="/sto"
            className="text-sm font-medium text-white/80 hover:text-emerald-400 transition-colors"
          >
            СТО
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-emerald-400 transition-colors"
              >
                <User className="h-4 w-4" />
                {user?.email?.split("@")[0] ?? user?.email}
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
            >
              Войти
            </Link>
          )}
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10 md:hidden"
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
            className="border-t border-white/10 bg-black/20 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4">
              <Link
                to="/city"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-white/90 hover:bg-white/10"
              >
                Выбор города
              </Link>
              <Link
                to="/sto"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-white/90 hover:bg-white/10"
              >
                СТО
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-white/90 hover:bg-white/10"
                  >
                    {user?.email?.split("@")[0] ?? user?.email}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="rounded-lg px-4 py-3 text-left text-red-400 hover:bg-white/10"
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
