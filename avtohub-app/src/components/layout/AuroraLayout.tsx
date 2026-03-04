import type { ReactNode } from "react";

interface AuroraLayoutProps {
  children: ReactNode;
}

export function AuroraLayout({ children }: AuroraLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0e17]">
      {children}
    </div>
  );
}
