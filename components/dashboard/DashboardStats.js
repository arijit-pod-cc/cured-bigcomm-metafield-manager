"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StatCard from "./StatCard";
import { fetchDashboardStats } from "@/app/actions/fetchDashboardStats";

export default function DashboardStats() {
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";

  const [stats, setStats] = useState({
    metaCategoriesCount: 0,
    metaobjectsCount: 0,
  });

  useEffect(() => {
    if (!context) return;
    fetchDashboardStats(context)
      .then((data) => setStats(data))
      .catch((err) => console.error("Error loading stats:", err));
  }, [context]);

  const withContext = (href) =>
    context ? `${href}?context=${encodeURIComponent(context)}` : href;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Meta Categories"
        value={String(stats.metaCategoriesCount)}
        href={withContext("/meta-categories")}
        linkText="Manage categories"
      />

      <StatCard
        label="Meta Objects"
        value={String(stats.metaobjectsCount)}
        href={withContext("/meta-objects")}
        linkText="Manage objects"
      />

      <StatCard
        label="Store Status"
        value="Active"
        valueClassName="text-emerald-600"
        description="BigCommerce store connected"
      />
    </div>
  );
}
