import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PartnerProtectedRoute } from "./routes/PartnerProtectedRoute";
import { PartnerLayout } from "./layouts/PartnerLayout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { RegisterSuccess } from "./pages/RegisterSuccess";
import { SetPassword } from "./pages/SetPassword";
import { Dashboard } from "./pages/Dashboard";
import { Bookings } from "./pages/Bookings";
import { Services } from "./pages/Services";
import { Analytics } from "./pages/Analytics";
import { Chat } from "./pages/Chat";
import { Profile } from "./pages/Profile";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-success" element={<RegisterSuccess />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route
            element={
              <PartnerProtectedRoute>
                <PartnerLayout />
              </PartnerProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="services" element={<Services />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="chat" element={<Chat />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
