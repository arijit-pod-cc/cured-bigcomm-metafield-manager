"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function Logo() {
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";
  const href = context ? `/?context=${encodeURIComponent(context)}` : "/";

  return (
    <Link
      href={href}
      aria-label="Metafields Manager home"
      className="flex items-center"
    >
      <Image
        src="/metafields-manager-logo.png"
        alt="Metafields Manager"
        width={350}
        height={130}
        className="h-auto w-[110px] object-contain"
        priority
      />
    </Link>
  );
}