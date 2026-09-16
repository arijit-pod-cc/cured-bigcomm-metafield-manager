"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Check, Loader2, Layers } from "lucide-react";
import { fetchProductVariantsForPicker } from "@/app/actions/fetchProductVariantsForPicker";

export default function VariantPickerModal({
  open,
  onClose,
  onSelect,
  selectedIds = [],
  isList = false,
  context,
}) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const current = Array.isArray(selectedIds)
      ? selectedIds.map(String).filter(Boolean)
      : selectedIds
      ? [String(selectedIds)]
      : [];
    setSelected(current);
    setSearch("");
    loadVariants("");
  }, [open, selectedIds]);

  async function loadVariants(query = "") {
    if (!context) return;
    try {
      setLoading(true);
      const res = await fetchProductVariantsForPicker(context, query);
      if (res?.success) {
        setVariants(res.variants || []);
      } else {
        setVariants([]);
      }
    } catch (err) {
      console.error("Error loading variants for picker:", err);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadVariants(val);
    }, 300);
  }

  function handleToggle(variant) {
    const id = String(variant.variantId || variant.id);
    if (isList) {
      if (selected.includes(id)) {
        setSelected(selected.filter((item) => item !== id));
      } else {
        setSelected([...selected, id]);
      }
    } else {
      setSelected([id]);
    }
  }

  function handleConfirm() {
    if (isList) {
      onSelect(selected);
    } else {
      onSelect(selected[0] || "");
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Select Product Variant{isList ? "s" : ""}
            </h2>
            <p className="text-xs text-slate-500">
              {isList
                ? "Choose one or more product variants to reference"
                : "Choose a specific product variant to reference"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-200 px-6 py-3 bg-slate-50/50">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by product name, SKU, or option..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[460px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-sm font-medium">Loading variants from BigCommerce...</span>
            </div>
          ) : variants.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <Layers className="mx-auto mb-2 text-slate-300" size={32} />
              No variants found matching your search.
            </div>
          ) : (
            variants.map((v) => {
              const vid = String(v.variantId || v.id);
              const isChecked = selected.includes(vid);
              return (
                <div
                  key={vid}
                  onClick={() => handleToggle(v)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-50/40 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {v.image ? (
                        <img
                          src={v.image}
                          alt={v.variantTitle}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <Layers size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {v.productName}
                        </span>
                        {v.options && v.options !== "Default Variant" && (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            {v.options}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span>
                          Variant ID: <span className="font-mono text-slate-700">{vid}</span>
                        </span>
                        {v.sku && (
                          <span>
                            SKU: <span className="font-mono text-slate-700">{v.sku}</span>
                          </span>
                        )}
                        {v.price !== undefined && (
                          <span className="font-medium text-slate-800">
                            ${Number(v.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition ml-3 ${
                      isList ? "rounded-md" : "rounded-full"
                    } border ${
                      isChecked
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          <span className="text-xs font-medium text-slate-500">
            {selected.length} {selected.length === 1 ? "variant" : "variants"} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
