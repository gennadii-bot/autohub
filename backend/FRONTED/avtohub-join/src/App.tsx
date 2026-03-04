import { ToastProvider } from "./context/ToastContext";
import { BecomePartner } from "./pages/BecomePartner";

export default function App() {
  return (
    <ToastProvider>
      <BecomePartner />
    </ToastProvider>
  );
}
