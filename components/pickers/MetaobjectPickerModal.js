"use client";

import { useState, useEffect } from "react";
import { X, Search, Check, Loader2, Database } from "lucide-react";
import { fetchMetaobjectEntries } from "@/app/actions/metaobjects/fetchMetaobjectEntries";

export default function MetaobjectPickerModal({
  open,
  onClose,
  onSelect,
  metaobjectDefinitionId,
  selectedIds = [],
  isList = false,
  context,
}) {
  const [entries, setEntries] = useState([]);
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!open || !metaobjectDefinitionId) return;
    const current = Array.isArray(selectedIds)
      ? selectedIds.map(String)
      : selectedIds
      ? [String(selectedIds)]
      : [];
    setSelected(current);
    loadEntries();
  }, [open, metaobjectDefinitionId, selectedIds]);

  async function loadEntries() {
    if (!context || !metaobjectDefinitionId) return;
    try {
      setLoading(true);
      const res = await fetchMetaobjectEntries(context, metaobjectDefinitionId);
      setEntries(res?.entries || []);
      setDefinition(res?.definition || null);
    } catch (err) {
      console.error("Error loading metaobject entries:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(entry) {
    const id = String(entry.id);
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

  const filteredEntries = entries.filter((e) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      e.displayName?.toLowerCase().includes(s) ||
      e.handle?.toLowerCase().includes(s)
    );
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Select {definition?.name || "Metaobject"} {isList ? "Entries" : "Entry"}
            </h2>
            <p className="text-xs text-slate-500">
              {isList ? "Choose one or more entries" : "Choose an entry to reference"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-200 px-6 py-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries..."
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 max-h-[420px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={20} />
              Loading entries...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No entries found.
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isChecked = selected.includes(String(entry.id));
              return (
                <div
                  key={entry.id}
                  onClick={() => handleToggle(entry)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                    isChecked
                      ? "border-purple-500 bg-purple-50/50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-100 text-purple-600">
                      <Database size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {entry.displayName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Handle: {entry.handle} • ID: {entry.id}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                      isChecked
                        ? "border-purple-600 bg-purple-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check size={14} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <span className="text-xs text-slate-500">
            {selected.length} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
