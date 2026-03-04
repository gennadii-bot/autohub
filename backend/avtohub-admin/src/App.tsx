import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminProtectedRoute } from "./routes/AdminProtectedRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { Login } from "./pages/Login";
import { AccessDenied } from "./pages/AccessDenied";
import { Dashboard } from "./pages/Dashboard";
import { StoRequests } from "./pages/StoRequests";
import { Users } from "./pages/Users";
import { UserDetail } from "./pages/UserDetail";
import { Stos } from "./pages/Stos";
import { StoDetail } from "./pages/StoDetail";
import { StoAnalytics } from "./pages/StoAnalytics";
import { Services } from "./pages/Services";
import { Bookings } from "./pages/Bookings";
import { Reviews } from "./pages/Reviews";
import { Placeholder } from "./pages/Placeholder";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route
            path="/"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="sto-requests" element={<StoRequests />} />
            <Route path="stos" element={<Stos />} />
            <Route path="stos/:id" element={<StoDetail />} />
            <Route path="stos/:id/analytics" element={<StoAnalytics />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="services" element={<Services />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="finance" element={<Placeholder title="Финансы" />} />
            <Route path="logs" element={<Placeholder title="Логи системы" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
