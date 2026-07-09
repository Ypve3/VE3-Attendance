import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(62,119,191,0.15)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_16px_36px_-14px_rgba(62,119,191,0.28)]",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "outline" | "success" | "warning" }) {
  const styles = {
    default: "bg-brand text-white border-transparent",
    secondary: "bg-gray-100 text-gray-600 border-transparent",
    outline: "text-gray-700 border-gray-300",
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-orange-50 text-orange-600 border-orange-200",
  } as const;
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
