import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "repotato — discover awesome repos from your terminal",
  description:
    "Discover awesome GitHub repos from your terminal. Upvote = star.",
  icons: { icon: "/repotato_logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
