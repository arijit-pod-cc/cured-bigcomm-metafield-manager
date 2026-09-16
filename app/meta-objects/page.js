"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Database,
  Layers,
  FileText,
  Trash2,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { fetchMetaobjectDefinitions } from "@/app/actions/metaobjects/fetchMetaobjectDefinitions";
import { deleteMetaobjectDefinition } from "@/app/actions/metaobjects/deleteMetaobjectDefinition";

export default function MetaobjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";

  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  async function loadDefinitions() {
    if (!context) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await fetchMetaobjectDefinitions(context);
      setDefinitions(res?.definitions || []);
    } catch (err) {
      console.error("Failed to load metaobjects:", err);
      setError(err?.message || "Failed to load metaobjects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDefinitions();
  }, [context]);

  function navigateTo(path) {
    const nextUrl = context
      ? `${path}${path.includes("?") ? "&" : "?"}context=${encodeURIComponent(context)}`
      : path;
    router.push(nextUrl);
  }

  async function handleDelete(def, e) {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete "${def.name}"? All associated entries will be permanently deleted.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(def.id);
      await deleteMetaobjectDefinition(context, def.id);
      setDefinitions((prev) => prev.filter((d) => d.id !== def.id));
    } catch (err) {
      alert(err?.message || "Failed to delete metaobject definition");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredDefinitions = definitions.filter((d) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      d.name?.toLowerCase().includes(s) ||
      d.type?.toLowerCase().includes(s) ||
      d.description?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Metaobjects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Define reusable custom data structures (like size guides, warranties, designers) that products can reference.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo("/meta-objects/new")}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
        >
          <Plus size={16} />
          Create metaobject
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
            placeholder="Search metaobjects by name or handle..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {filteredDefinitions.length} definition{filteredDefinitions.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm">Loading metaobject definitions...</p>
        </div>
      ) : filteredDefinitions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
            <Database size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {search ? "No matching metaobjects found" : "No metaobjects defined yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Metaobjects let you structure complex content such as fabric care guides, warranty policies, lookbook items, and team profiles.
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => navigateTo("/meta-objects/new")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              <Plus size={16} />
              Create your first metaobject
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Name & Type</th>
                <th className="px-6 py-3.5">Fields</th>
                <th className="px-6 py-3.5">Entries</th>
                <th className="px-6 py-3.5">Display Field</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDefinitions.map((def) => (
                <tr
                  key={def.id}
                  onClick={() => navigateTo(`/meta-objects/${def.type}`)}
                  className="group cursor-pointer transition hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-200 bg-purple-50 text-purple-600">
                        <Database size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-purple-600">
                          {def.name}
                        </p>
                        <p className="font-mono text-xs text-slate-400">
                          {def.type}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <Layers size={13} className="text-slate-400" />
                      {def.fieldCount} field{def.fieldCount === 1 ? "" : "s"}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                      <FileText size={13} className="text-purple-400" />
                      {def.entryCount} {def.entryCount === 1 ? "entry" : "entries"}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {def.displayFieldKey || "name"}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo(`/meta-objects/${def.type}`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Entries <ChevronRight size={13} />
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === def.id}
                        onClick={(e) => handleDelete(def, e)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Delete definition"
                      >
                        {deletingId === def.id ? (
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