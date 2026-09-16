"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import ProductTable from "./ProductTable";
import { fetchCategoryItems } from "@/app/actions/fetchCategoryItems";

export default function VariantCategoryItems({ category, context }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryContext = searchParams.get("context") || context || "";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    perPage: 20,
  });

  useEffect(() => {
    if (!queryContext) {
      setLoading(false);
      setError("Missing app context. Please reload the app from BigCommerce.");
      setItems([]);
      return;
    }

    async function loadItems() {
      try {
        setLoading(true);
        setError("");

        const result = await fetchCategoryItems(category, queryContext, {
          page,
          limit: 50,
          search,
        });

        setItems(result.items || []);
        setPagination(result.pagination || {
          total: 0,
          totalPages: 1,
          currentPage: page,
          perPage: 20,
        });
      } catch (err) {
        setError(err.message || "Failed to load variants");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, [category, queryContext, page, search]);

  function handleSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function handleEdit(item) {
    const target = `/meta-categories/${category}/${item.id}`;
    const nextUrl = queryContext ? `${target}?context=${encodeURIComponent(queryContext)}` : target;
    router.push(nextUrl);
  }

  function goBack() {
    const target = "/meta-categories";
    const nextUrl = queryContext ? `${target}?context=${encodeURIComponent(queryContext)}` : target;
    router.push(nextUrl);
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            <span>Variants</span>
            <span className="ml-2 text-slate-500">({pagination.total})</span>
          </h1>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
          <div className="relative w-full sm:w-[280px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search variants..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const target = `/meta-categories/${category}/metafields`;
              const nextUrl = queryContext ? `${target}?context=${encodeURIComponent(queryContext)}` : target;
              router.push(nextUrl);
            }}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            View metafields
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {error && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <ProductTable items={items} loading={loading} onEdit={handleEdit} />

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
