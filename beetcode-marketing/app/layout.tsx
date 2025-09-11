import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beetcode - LeetCode Problem Tracker",
  description: "Track your LeetCode progress with the Beetcode Chrome extension",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}