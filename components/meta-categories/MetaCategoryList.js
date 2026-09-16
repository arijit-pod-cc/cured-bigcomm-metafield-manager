"use client";
import { useSearchParams } from "next/navigation";
import { withContextParam } from "@/lib/route-utils";
import MetaCategoryRow from "./MetaCategoryRow";

// Categories data
import { categories } from "@/data/meta-categories";

export default function MetaCategoryList() {
  const searchParams = useSearchParams();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {categories.map((category) => (
        <MetaCategoryRow
          key={category.name}
          name={category.name}
          count={category.count}
          icon={category.icon}
          href={withContextParam(category.href, searchParams)}
        />
      ))}
    </div>
  );
}