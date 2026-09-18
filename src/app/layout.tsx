import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "受付Bot作成サービス",
  description:
    "目的と業種を選ぶだけで、自社用のチャット形式の受付Botが作れるサービス。",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
