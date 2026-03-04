import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { PartnerHeader } from "../components/PartnerHeader";

export function PartnerLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col">
        <PartnerHeader />
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
