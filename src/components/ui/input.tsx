"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand/10 focus:border-brand disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
