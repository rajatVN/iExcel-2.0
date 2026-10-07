import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iExcel 2.0 In-Basket",
  description: "iExcel 2.0 – In-Basket Assessment · Project Drishti",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
