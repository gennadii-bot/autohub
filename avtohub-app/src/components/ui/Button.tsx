import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "rounded-2xl px-6 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
