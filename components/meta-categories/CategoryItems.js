"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit,
  Search,
} from "lucide-react";

import ProductTable from "./ProductTable";

const CATEGORY_CONFIG = {
  products: {
    title: "Products",
    description: "Manage metafield values assigned to your products.",
  },

  orders: {
    title: "Orders",
    description: "Manage metafield values assigned to your orders.",
  },

  variants: {
    title: "Variants",
    description: "Manage metafield values assigned to your variants.",
  },

  categories: {
    title: "Categories",
    description: "Manage metafield values assigned to your categories.",
  },

  customers: {
    title: "Customers",
    description: "Manage metafield values assigned to your customers.",
  },
};

export default function CategoryItems({ category, items: initialItems = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";

  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(!initialItems.length);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(
    searchParams.get("search") || ""
  );

  const [page, setPage] = useState(
    Number(searchParams.get("page")) || 1
  );

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    perPage: 20,
  });

  const config = CATEGORY_CONFIG[category] || {
    title: category.charAt(0).toUpperCase() + category.slice(1),
    description: `Manage metafield values assigned to ${category}.`,
  };

  useEffect(() => {
    if (!context) {
      setLoading(false);
      setError("Missing app context. Please reload the app from BigCommerce.");
      setItems([]);
      return;
    }

    if (initialItems.length) {
      setItems(initialItems);
      setLoading(false);
      return;
    }

    fetchItems();
  }, [category, page, search, context, initialItems]);

  async function fetchItems() {
    try {
      setLoading(true);
      setError("");

      if (!context) {
        throw new Error(
          "Missing app context. Please reload the app from BigCommerce."
        );
      }

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", "20");
      params.set("context", context);

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `/api/meta-categories/${category}?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load items"
        );
      }

      setItems(data.items || []);

      setPagination(
        data.pagination || {
          total: 0,
          totalPages: 1,
          currentPage: page,
          perPage: 20,
        }
      );
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function handleEdit(item) {
    const target = `/meta-categories/${category}/${item.id}`;
    const nextUrl = context ? `${target}?context=${encodeURIComponent(context)}` : target;
    router.push(nextUrl);
  }

  function goBack() {
    const target = "/meta-categories";
    const nextUrl = context ? `${target}?context=${encodeURIComponent(context)}` : target;
    router.push(nextUrl);
  }

  return (
    <div className="mx-auto w-full max-w-6xl">

      {/* Back */}
      <button
        onClick={goBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Back to categories
      </button>

      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {category.charAt(0).toUpperCase() + category.slice(1)} ({pagination.total})
        </h1>

        {/* <p className="mt-1 text-sm text-slate-500">
          {config.description}
        </p> */}
      </div>

      {/* Main card */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">

          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}...`}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {/* Results */}
          <div className="text-sm text-slate-500">
            {pagination.total}{" "}
            {config.title.toLowerCase()}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <ProductTable
          items={items}
          loading={loading}
          onEdit={handleEdit}
        />

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-sm text-slate-500">
            Page {pagination.currentPage} of{" "}
            {pagination.totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() =>
                setPage((current) => current - 1)
              }
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              disabled={
                page >= pagination.totalPages || loading
              }
              onClick={() =>
                setPage((current) => current + 1)
              }
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