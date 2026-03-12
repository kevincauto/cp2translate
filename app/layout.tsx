import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The AI Translation Consultant",
  description: "Hack Week tool for translating JSON files with AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
