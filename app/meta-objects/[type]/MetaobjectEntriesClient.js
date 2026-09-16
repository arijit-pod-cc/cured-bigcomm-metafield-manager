"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Search,
  Database,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { fetchMetaobjectEntries } from "@/app/actions/metaobjects/fetchMetaobjectEntries";
import { deleteMetaobjectEntry } from "@/app/actions/metaobjects/deleteMetaobjectEntry";

export default function MetaobjectEntriesClient({ type }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";

  const [definition, setDefinition] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  async function loadData() {
    if (!context || !type) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetchMetaobjectEntries(context, type);
      setDefinition(res?.definition || null);
      setEntries(res?.entries || []);
    } catch (err) {
      console.error("Failed to load entries:", err);
      setError(err?.message || "Failed to load metaobject entries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [type, context]);

  function navigateTo(path) {
    const nextUrl = context
      ? `${path}${path.includes("?") ? "&" : "?"}context=${encodeURIComponent(context)}`
      : path;
    router.push(nextUrl);
  }

  async function handleDelete(entry, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete entry "${entry.displayName}"?`)) return;

    try {
      setDeletingId(entry.id);
      await deleteMetaobjectEntry(context, entry.id);
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (err) {
      alert(err?.message || "Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredEntries = entries.filter((e) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      e.displayName?.toLowerCase().includes(s) ||
      e.handle?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigateTo("/meta-objects")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {definition?.name || type}
              </h1>
              <span className="rounded-lg bg-purple-50 px-2.5 py-0.5 font-mono text-xs font-medium text-purple-700 border border-purple-200">
                {type}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage reusable entries for this metaobject.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigateTo(`/meta-objects/${type}/new`)}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
        >
          <Plus size={16} />
          Add entry
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm">Loading entries...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
            <Database size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {search ? "No matching entries found" : "No entries yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Create entries for {definition?.name || type} to reference them across products or display on your storefront.
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => navigateTo(`/meta-objects/${type}/new`)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
            >
              <Plus size={16} />
              Add your first entry
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Entry Title</th>
                <th className="px-6 py-3.5">Handle</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Last Updated</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => navigateTo(`/meta-objects/${type}/${entry.id}`)}
                  className="group cursor-pointer transition hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 group-hover:text-purple-600">
                      {entry.displayName}
                    </p>
                    <span className="text-xs text-slate-400">ID: {entry.id}</span>
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {entry.handle}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        entry.status === "active"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.status || "active"}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-500">
                    {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : "—"}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo(`/meta-objects/${type}/${entry.id}`);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        title="Edit entry"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === entry.id}
                        onClick={(e) => handleDelete(entry, e)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Delete entry"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
