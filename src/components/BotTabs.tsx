"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BotTabs({ botId }: { botId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/bots/${botId}`;

  const tabs = [
    { href: base, label: "概要" },
    { href: `${base}/edit`, label: "質問編集" },
    { href: `${base}/preview`, label: "プレビュー" },
    { href: `${base}/publish`, label: "公開設定" },
    { href: `${base}/responses`, label: "回答ログ" },
  ];

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-gray-200">
      {tabs.map((t) => {
        const active =
          t.href === base
            ? pathname === base
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
