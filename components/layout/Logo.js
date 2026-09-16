
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function Logo() {
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";
  const href = context ? `/?context=${encodeURIComponent(context)}` : "/";

  return (
    <Link href={href} className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
        M
      </div>

      <div>
        <h1 className="text-sm font-semibold tracking-tight text-slate-900">
          Meta Manager
        </h1>

        <p className="text-[11px] text-slate-500">
          BigCommerce
        </p>
      </div>
    </Link>
  );
}

