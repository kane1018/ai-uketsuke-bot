import type { BotStatus } from "@/lib/types";

const MAP: Record<BotStatus, { label: string; className: string }> = {
  draft: { label: "下書き", className: "bg-gray-200 text-gray-700" },
  published: { label: "公開中", className: "bg-green-100 text-green-700" },
  archived: { label: "アーカイブ", className: "bg-gray-100 text-gray-500" },
};

export function BotStatusBadge({ status }: { status: BotStatus }) {
  const s = MAP[status] ?? MAP.draft;
  return <span className={`badge ${s.className}`}>{s.label}</span>;
}
