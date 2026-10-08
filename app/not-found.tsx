import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-semibold">ไม่พบหน้านี้</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">นักลงทุน ไตรมาส หรือหุ้นที่ค้นหาอาจยังไม่มีในระบบ</p>
      <Link href="/" className="mt-6 inline-block underline">
        กลับหน้ารวม
      </Link>
    </main>
  );
}
