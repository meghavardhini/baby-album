import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baby Album",
  description: "Turn a year of your little one's photos into a keepsake album.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
