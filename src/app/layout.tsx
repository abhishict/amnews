import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMNews",
  description: "Today's headlines, explained simply.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f8f9fa] text-slate-900 antialiased">{children}</body>
    </html>
  );
}
