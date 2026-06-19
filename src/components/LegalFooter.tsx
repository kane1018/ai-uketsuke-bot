import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/legal", label: "特定商取引法に基づく表記" },
  { href: "/refund-policy", label: "解約・返金ポリシー" },
] as const;

export function LegalFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center text-xs text-gray-500">
        <nav aria-label="法務情報" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-700 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} AI受付Bot作成サービス</p>
      </div>
    </footer>
  );
}
