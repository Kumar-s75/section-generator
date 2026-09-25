import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Uncody — AI Section Generator & Editor",
  description:
    "Turn a little prompt into a beautiful, editable website section. A mock AI playground.",
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
