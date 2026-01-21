import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./providers/ThemeProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import { WorkspaceProvider } from "./providers/WorkspaceProvider";

const mainFont = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Botia CRM",
  description: "Advanced AI CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body
        className={`${mainFont.variable} font-sans antialiased h-full m-0 p-0`}
      >
        <ThemeProvider>
          <NotificationProvider>
            <WorkspaceProvider>
              {children}
            </WorkspaceProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
