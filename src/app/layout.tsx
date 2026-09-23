import type { Metadata } from "next";
import { SITE_URL, SITE_DESCRIPTION } from "@/lib/site";
import { PublicObservability } from "@/components/PublicObservability";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "受付Bot｜会話形式の問い合わせフォームを30日無料で", template: "%s | 受付Bot" },
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.svg" },
  openGraph: { locale: "ja_JP", type: "website", siteName: "受付Bot" },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a href="#main-content" className="skip-link">本文へ移動</a>
        {children}
        <PublicObservability />
      </body>
    </html>
  );
}
