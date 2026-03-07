import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM i18next Translator",
  description: "Hack Week tool for parallel i18next translation and review",
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
