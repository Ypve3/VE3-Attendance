"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive";
type Size = "default" | "sm" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  default:
    "text-white bg-gradient-to-b from-[#4a85d1] to-brand border border-brand shadow-sm shadow-brand/30 hover:shadow-md hover:shadow-brand/40 hover:brightness-105",
  outline: "border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700",
  ghost: "border border-transparent hover:bg-gray-100 text-gray-600",
  destructive: "text-white bg-red-600 border border-red-600 hover:bg-red-700 shadow-sm shadow-red-600/30",
};

const sizeClasses: Record<Size, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  icon: "h-9 w-9",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 overflow-hidden group",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {variant === "default" && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  )
);
Button.displayName = "Button";
