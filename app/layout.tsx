import type { Metadata } from "next";
import "@/app/styles/globals.css";

export const metadata: Metadata = {
  title: "HiggsField Automation",
  description: "Browser-side HiggsField generation automation tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
