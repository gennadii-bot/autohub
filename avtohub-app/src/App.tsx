import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";
import { CityProvider } from "./context/CityContext";
import { ToastProvider } from "./context/ToastContext";
import { ToastContainer } from "./components/ui/Toast";
import { ClientRoute } from "./routes/ClientRoute";
import { GuestOnlyRoute } from "./routes/GuestOnlyRoute";
import { LandingOrRedirect } from "./routes/LandingOrRedirect";
import { CityRouteGuard } from "./routes/CityRouteGuard";
import { AuroraLayout } from "./components/layout/AuroraLayout";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { Home } from "./pages/Home";
import { CitySelectPage } from "./pages/CitySelectPage";
import { STOList } from "./pages/STOList";
import { STOProfile } from "./pages/STOProfile";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { DashboardHome } from "./pages/dashboard/DashboardHome";
import { DashboardBookings } from "./pages/dashboard/DashboardBookings";
import { DashboardHistory } from "./pages/dashboard/DashboardHistory";
import { DashboardFavorites } from "./pages/dashboard/DashboardFavorites";
import { DashboardChat } from "./pages/dashboard/DashboardChat";
import { DashboardProfile } from "./pages/dashboard/DashboardProfile";
import { BookPage } from "./pages/BookPage";
import { Success } from "./pages/Success";
import { Login } from "./pages/Auth/Login";
import { Register } from "./pages/Auth/Register";

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <LandingOrRedirect>
                    <Home />
                  </LandingOrRedirect>
                }
              />
              <Route path="/select-city" element={<CitySelectPage />} />
              <Route path="/city" element={<Navigate to="/select-city" replace />} />
              <Route
                path="/sto"
                element={
                  <CityRouteGuard>
                    <STOList />
                  </CityRouteGuard>
                }
              />
              <Route
                path="/sto/:id"
                element={
                  <CityRouteGuard>
                    <STOProfile />
                  </CityRouteGuard>
                }
              />
              <Route path="/book/:stoSlug" element={<BookPage />} />
              <Route path="/success" element={<Success />} />
              <Route
                path="/login"
                element={
                  <GuestOnlyRoute>
                    <Login />
                  </GuestOnlyRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <GuestOnlyRoute>
                    <Register />
                  </GuestOnlyRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ClientRoute>
                    <DashboardLayout />
                  </ClientRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="bookings" element={<DashboardBookings />} />
                <Route path="history" element={<DashboardHistory />} />
                <Route path="favorites" element={<DashboardFavorites />} />
                <Route path="chat" element={<DashboardChat />} />
                <Route path="profile" element={<DashboardProfile />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CityProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuroraLayout>
              <div className="flex min-h-screen flex-col">
                <Header />
              <main className="flex-1">
                <AppRoutes />
              </main>
              <Footer />
                <ToastContainer />
              </div>
            </AuroraLayout>
          </BrowserRouter>
        </ToastProvider>
      </CityProvider>
    </AuthProvider>
  );
}
