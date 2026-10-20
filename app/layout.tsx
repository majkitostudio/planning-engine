import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plánovací Engine",
  description: "Počáteční technický scaffold budoucího plánovacího enginu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
