import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-4 text-xl font-bold">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-gray-500">
        お探しのページは存在しないか、公開されていない可能性があります。
      </p>
      <Link href="/" className="btn-primary mt-6">
        トップへ戻る
      </Link>
    </div>
  );
}
