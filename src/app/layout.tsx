import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "StaffX",
  description: "StaffX by VE3 Global — face-recognition attendance, visitors and reporting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
