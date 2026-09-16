
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
  },
  {
    name: "Meta Categories",
    href: "/meta-categories",
  },
  {
    name: "Meta Objects",
    href: "/meta-objects",
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";

  return (
    <nav className="flex items-center gap-1">
      {navigation.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        const href = context
          ? `${item.href}${item.href.includes("?") ? "&" : "?"}context=${encodeURIComponent(context)}`
          : item.href;

        return (
          <Link
            key={item.href}
            href={href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

