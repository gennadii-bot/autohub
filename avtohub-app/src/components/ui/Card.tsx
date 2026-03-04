import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white shadow-lg ${className}`}>
      {children}
    </div>
  );
}
