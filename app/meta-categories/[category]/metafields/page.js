"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Search,
  Pencil,
  Trash2,
  Code,
  Copy,
  Check,
  X,
  Loader2,
} from "lucide-react";

import { fetchMetafields } from "@/app/actions/fetchMetafields";
import { createMetafield } from "@/app/actions/createMetafield";
import { updateMetafield } from "@/app/actions/updateMetafield";
import { getMetafield } from "@/app/actions/getMetafield";
import { deleteMetafield } from "@/app/actions/deleteMetafield";

import AddMetafieldModal from "@/components/meta-categories/AddMetafieldModal";

function getExampleValue(type, isList) {
  let val = "Sample text";
  switch (type) {
    case "single_line_text":
      val = "Sample text value";
      break;
    case "multi_line_text":
      val = "Multi-line text content";
      break;
    case "rich_text":
      val = "<p>Sample <strong>rich text</strong></p>";
      break;
    case "number_integer":
      val = 42;
      break;
    case "number_decimal":
      val = 19.99;
      break;
    case "boolean":
      val = true;
      break;
    case "date":
      val = "2026-09-15";
      break;
    case "date_time":
      val = "2026-09-15T12:00:00Z";
      break;
    case "url":
      val = "https://example.com";
      break;
    case "color":
      val = "#2563eb";
      break;
    case "json":
      val = { active: true, label: "Sample JSON" };
      break;
    case "file":
      val = "https://store-2dcwnfok6l.mybigcommerce.com/content/metafields/sample.png";
      break;
    case "product_reference":
      val = "117";
      break;
    case "variant_reference":
      val = "452";
      break;
    case "category_reference":
      val = "18";
      break;
    case "customer_reference":
      val = "1";
      break;
    case "order_reference":
      val = "100";
      break;
    case "metaobject_reference":
      val = "5";
      break;
    default:
      val = "Sample value";
  }
  return isList ? [val] : val;
}

export default function MetafieldsPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { category } = use(params);

  const context = searchParams.get("context") || "";

  const [metafields, setMetafields] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");

  const [selectedMetafield, setSelectedMetafield] =
    useState(null);

  const [loadingMetafield, setLoadingMetafield] =
    useState(false);

  const [snippetMetafield, setSnippetMetafield] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(metafield) {
    const identifier = `${metafield.namespace}.${metafield.key || metafield.namespace}`;
    if (
      !window.confirm(
        `Are you sure you want to delete "${metafield.name}" (${identifier})? This definition will be removed.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(metafield.id);
      await deleteMetafield(metafield.id, category, context);
      setMetafields((prev) => prev.filter((m) => m.id !== metafield.id));
    } catch (err) {
      alert(err?.message || "Failed to delete metafield");
    } finally {
      setDeletingId(null);
    }
  }

  async function loadMetafields() {
    if (!context) {
      setLoading(false);
      setError(
        "Missing app context. Please reload the app from BigCommerce."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await fetchMetafields(
        category,
        context,
        {
          search,
        }
      );

      setMetafields(result.metafields || []);
    } catch (err) {
      setError(
        err.message || "Failed to load metafields"
      );

      setMetafields([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetafields();
  }, [category, context, search]);

  function goBack() {
    const target = `/meta-categories/${category}`;

    const nextUrl = context
      ? `${target}?context=${encodeURIComponent(context)}`
      : target;

    router.push(nextUrl);
  }

  function openCreateModal() {
    setModalMode("create");
    setSelectedMetafield(null);
    setModalOpen(true);
  }

  async function openEditModal(metafieldId) {
    try {
      setLoadingMetafield(true);
      setError("");

      const result = await getMetafield(
        metafieldId,
        category,
        context
      );

      setSelectedMetafield(result.metafield);
      setModalMode("edit");
      setModalOpen(true);
    } catch (err) {
      setError(
        err.message || "Failed to load metafield"
      );
    } finally {
      setLoadingMetafield(false);
    }
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setSelectedMetafield(null);
  }

  async function handleSubmit(data) {
    try {
      setSaving(true);
      setError("");

      if (modalMode === "create") {
        await createMetafield(
          category,
          context,
          data
        );
      } else {
        await updateMetafield(
          selectedMetafield.id,
          category,
          context,
          data
        );
      }

      setModalOpen(false);
      setSelectedMetafield(null);

      await loadMetafields();
    } catch (err) {
      throw new Error(
        err.message ||
          `Failed to ${
            modalMode === "create"
              ? "create"
              : "update"
          } metafield`
      );
    } finally {
      setSaving(false);
    }
  }

  const categoryName =
    category.charAt(0).toUpperCase() +
    category.slice(1);

  return (
    <>
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {categoryName} Metafields

              <span className="ml-2 text-slate-500">
                ({metafields.length})
              </span>
            </h1>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-[280px]">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search metafields..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Add */}
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={17} />
              Add Metafield
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex h-[72px] animate-pulse items-center gap-6 px-5"
                >
                  <div className="h-4 w-40 rounded bg-slate-100" />
                  <div className="h-4 w-28 rounded bg-slate-100" />
                  <div className="h-6 w-32 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : metafields.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Search
                  size={22}
                  className="text-slate-500"
                />
              </div>

              <h3 className="text-sm font-semibold text-slate-900">
                No metafields found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create your first metafield for this
                category.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
                Add Metafield
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Type
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Namespace
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Required
                    </th>

                    <th className="w-24 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {metafields.map((metafield) => (
                    <tr
                      key={metafield.id}
                      className="group transition-colors hover:bg-slate-50"
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-900">
                          {metafield.name}
                        </p>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {metafield.type}

                        {Boolean(metafield.isList) && (
                          <span className="ml-1 text-xs font-medium text-slate-500">
                            (List)
                          </span>
                        )}
                      </td>

                      {/* Namespace & Key */}
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
                          {metafield.namespace}.{metafield.key || metafield.namespace}
                        </span>
                      </td>

                      {/* Required */}
                      <td className="px-5 py-4 text-sm">
                        {Boolean(metafield.isRequired) ? (
                          <span className="text-slate-700">
                            Required
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Optional
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSnippetMetafield(metafield)}
                            title="View API Endpoint & Response Data"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Code size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                metafield.id
                              )
                            }
                            disabled={loadingMetafield || deletingId === metafield.id}
                            title="Edit metafield"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(metafield)}
                            disabled={loadingMetafield || deletingId === metafield.id}
                            title="Delete metafield"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === metafield.id ? (
                              <Loader2 size={14} className="animate-spin text-red-500" />
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
        </section>
      </div>

      {/* Metafield API Endpoint & Response Modal */}
      {snippetMetafield && (() => {
        const sampleId = category === "products" ? "117" : (category === "blogs" ? "1" : "21");
        const idVar = category === "products" ? "productId" : (category === "blogs" ? "blogId" : "pageId");
        const endpointPath = `/api/metafield-value/${category}/${sampleId}`;
        const fetchCode = `// Fetch ${snippetMetafield.name} (${category})\nconst res = await fetch('/api/metafield-value/${category}/' + ${idVar});\nconst data = await res.json();\n\n// Access the metafield value\nconst ${snippetMetafield.key || "value"} = data.metafield["${fullKey}"];\nconsole.log(${snippetMetafield.key || "value"});`;
        
        const sampleResponse = JSON.stringify(
          {
            success: true,
            category: category,
            id: Number(sampleId),
            metafield: {
              [fullKey]: getExampleValue(snippetMetafield.type, snippetMetafield.isList),
            },
          },
          null,
          2
        );

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSnippetMetafield(null);
            }}
          >
            <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Metafield API Endpoint & Response
                  </h3>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{snippetMetafield.name}</span>{" "}
                    (<code>{fullKey}</code>) • Type:{" "}
                    <span className="font-mono text-blue-600">{snippetMetafield.type}</span>
                    {Boolean(snippetMetafield.isList) && " • List"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSnippetMetafield(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-6 overflow-y-auto">
                {/* 1. Endpoint URL */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      API Endpoint
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = typeof window !== "undefined"
                          ? `${window.location.origin}${endpointPath}`
                          : endpointPath;
                        navigator.clipboard.writeText(url);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      {copiedUrl ? <Check size={12} /> : <Copy size={12} />}
                      {copiedUrl ? "Copied" : "Copy Endpoint URL"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                      GET
                    </span>
                    <span className="truncate">{endpointPath}</span>
                  </div>
                </div>

                {/* 2. Client-side Fetch Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Fetch Request Example
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(fetchCode);
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      {copiedSnippet ? <Check size={12} /> : <Copy size={12} />}
                      {copiedSnippet ? "Copied" : "Copy Code"}
                    </button>
                  </div>
                  <pre className="rounded-xl border border-slate-200 bg-slate-900 p-3.5 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                    {fetchCode}
                  </pre>
                </div>

                {/* 3. Expected Response Data */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Response Data (JSON)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(sampleResponse);
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                      {copiedJson ? "Copied" : "Copy JSON"}
                    </button>
                  </div>
                  <pre className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-mono text-slate-800 overflow-x-auto leading-relaxed">
                    {sampleResponse}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 px-6 py-3 text-right bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSnippetMetafield(null)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create / Edit Modal */}
      <AddMetafieldModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        loading={saving}
        mode={modalMode}
        initialData={selectedMetafield}
        context={context}
      />
    </>
  );
}