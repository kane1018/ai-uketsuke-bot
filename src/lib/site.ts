import type { Metadata } from "next";

export const SITE_URL = "https://chatbot-support.com";
export const SITE_NAME = "受付Bot";
export const SITE_DESCRIPTION = "必要なことを1問ずつ聞ける、会話形式の問い合わせフォーム。テンプレートを選んで公開し、URL共有やホームページへの埋め込みで受付を開始。ライトプラン30日無料、カード不要、自動課金なし。";

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}${path}`,
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: "website",
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "受付Bot：30日無料・カード不要" }],
    },
    twitter: { card: "summary_large_image" },
  };
}
