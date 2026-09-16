"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, ChevronDown, Database, Sliders } from "lucide-react";
import { METAFIELD_TYPES_BY_CATEGORY } from "@/data/meta-types";
import { fetchMetaobjectDefinitions } from "@/app/actions/metaobjects/fetchMetaobjectDefinitions";

function generateSlug(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export default function AddMetafieldModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  mode = "create",
  initialData = null,
  context = "",
}) {
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("custom");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [isList, setIsList] = useState(false);
  const [isRequired, setIsRequired] = useState(false);
  const [referenceMetaobjectDefinitionId, setReferenceMetaobjectDefinitionId] =
    useState("");

  // Validation states
  const [choices, setChoices] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  const [metaobjectDefs, setMetaobjectDefs] = useState([]);
  const [loadingDefs, setLoadingDefs] = useState(false);

  const [typeOpen, setTypeOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [error, setError] = useState("");

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;

    setError("");
    setTypeOpen(false);
    setTypeSearch("");

    if (initialData) {
      setName(initialData.name || "");
      setNamespace(initialData.namespace || "custom");
      setKey(initialData.key || initialData.namespace || "");
      setDescription(initialData.description || "");
      setType(initialData.type || "");
      setIsList(Boolean(initialData.isList));
      setIsRequired(Boolean(initialData.isRequired));
      setReferenceMetaobjectDefinitionId(
        initialData.referenceMetaobjectDefinitionId
          ? String(initialData.referenceMetaobjectDefinitionId)
          : ""
      );

      // Parse validations if present
      if (initialData.validations) {
        if (Array.isArray(initialData.validations.choices)) {
          setChoices(initialData.validations.choices.join(", "));
        } else {
          setChoices("");
        }
        setMinValue(
          initialData.validations.min !== undefined && initialData.validations.min !== null
            ? String(initialData.validations.min)
            : ""
        );
        setMaxValue(
          initialData.validations.max !== undefined && initialData.validations.max !== null
            ? String(initialData.validations.max)
            : ""
        );
      } else {
        setChoices("");
        setMinValue("");
        setMaxValue("");
      }
    } else {
      setName("");
      setNamespace("custom");
      setKey("");
      setDescription("");
      setType("");
      setIsList(false);
      setIsRequired(false);
      setReferenceMetaobjectDefinitionId("");
      setChoices("");
      setMinValue("");
      setMaxValue("");
    }
  }, [open, initialData]);

  // Auto-slugify key from name on create
  useEffect(() => {
    if (!isEdit && name) {
      setKey(generateSlug(name));
    }
  }, [name, isEdit]);

  // Load metaobject definitions when type is metaobject_reference
  useEffect(() => {
    if (type === "metaobject_reference" && context) {
      setLoadingDefs(true);
      fetchMetaobjectDefinitions(context)
        .then((res) => {
          setMetaobjectDefs(res?.definitions || []);
          if (res?.definitions?.length > 0 && !referenceMetaobjectDefinitionId) {
            setReferenceMetaobjectDefinitionId(String(res.definitions[0].id));
          }
        })
        .catch((err) => console.error("Error loading metaobjects for picker:", err))
        .finally(() => setLoadingDefs(false));
    }
  }, [type, context]);

  const selectedType = useMemo(() => {
    for (const category of Object.keys(METAFIELD_TYPES_BY_CATEGORY)) {
      const found = METAFIELD_TYPES_BY_CATEGORY[category].find(
        (item) => item.id === type
      );
      if (found) return found;
    }
    return null;
  }, [type]);

  const filteredTypes = useMemo(() => {
    const result = {};
    Object.entries(METAFIELD_TYPES_BY_CATEGORY).forEach(([category, types]) => {
      const filtered = types.filter((item) => {
        const search = typeSearch.trim().toLowerCase();
        if (!search) return true;
        return (
          item.name.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search)
        );
      });
      if (filtered.length) result[category] = filtered;
    });
    return result;
  }, [typeSearch]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!key.trim()) {
      setError("Key is required.");
      return;
    }

    if (!type) {
      setError("Please select a type.");
      return;
    }

    if (type === "metaobject_reference" && !referenceMetaobjectDefinitionId) {
      setError("Please select a target metaobject definition.");
      return;
    }

    // Build validations object
    const validations = {};
    if (choices.trim() && (type === "single_line_text" || type === "multi_line_text")) {
      validations.choices = choices
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }
    if (minValue !== "" && (type === "number_integer" || type === "number_decimal")) {
      validations.min = Number(minValue);
    }
    if (maxValue !== "" && (type === "number_integer" || type === "number_decimal")) {
      validations.max = Number(maxValue);
    }

    try {
      await onSubmit({
        name: name.trim(),
        namespace: namespace.trim() || "custom",
        key: generateSlug(key),
        description: description.trim(),
        type,
        isList,
        isRequired,
        validationsJson: Object.keys(validations).length > 0 ? JSON.stringify(validations) : null,
        referenceMetaobjectDefinitionId:
          type === "metaobject_reference" && referenceMetaobjectDefinitionId
            ? Number(referenceMetaobjectDefinitionId)
            : null,
      });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEdit ? "Edit metafield" : "Add metafield"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {isEdit
                ? "Update your metafield definition."
                : "Create a new metafield definition for this resource."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Name <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Care Instructions, Material, Warranty"
              disabled={loading}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>

          {/* Namespace and Key */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Namespace & Key <span className="ml-1 text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Namespace
                </span>
                <input
                  type="text"
                  value={namespace}
                  onChange={(e) => setNamespace(generateSlug(e.target.value))}
                  placeholder="custom"
                  disabled={loading}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Key
                </span>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(generateSlug(e.target.value))}
                  placeholder="care_instructions"
                  disabled={loading}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Full identifier:{" "}
              <code className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-slate-800 font-semibold">
                {namespace || "custom"}.{key || "key"}
              </code>
            </p>
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this metafield is used for"
              rows={2}
              disabled={loading}
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>

          {/* Type */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Type <span className="ml-1 text-red-500">*</span>
            </label>

            <div className="relative">
              <button
                type="button"
                disabled={loading}
                onClick={() => setTypeOpen((v) => !v)}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-left text-sm outline-none transition hover:border-slate-400 focus:border-blue-500"
              >
                <span className={selectedType ? "text-slate-900 font-medium" : "text-slate-400"}>
                  {selectedType?.name || "Select field type"}
                </span>
                <ChevronDown
                  size={17}
                  className={`text-slate-400 transition ${typeOpen ? "rotate-180" : ""}`}
                />
              </button>

              {typeOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-200 p-3">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={typeSearch}
                        onChange={(e) => setTypeSearch(e.target.value)}
                        placeholder="Search type..."
                        autoFocus
                        className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="max-h-[290px] overflow-y-auto">
                    {Object.entries(filteredTypes).map(([categoryName, types]) => (
                      <div key={categoryName}>
                        <div className="sticky top-0 border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {categoryName}
                        </div>

                        {types.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setType(item.id);
                              setTypeOpen(false);
                              setTypeSearch("");
                              if (item.id !== "metaobject_reference") {
                                setReferenceMetaobjectDefinitionId("");
                              }
                            }}
                            className={`w-full px-4 py-2.5 text-left transition hover:bg-slate-50 ${
                              type === item.id ? "bg-blue-50 text-blue-900" : ""
                            }`}
                          >
                            <div className="text-sm font-medium text-slate-900">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {item.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}

                    {Object.keys(filteredTypes).length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        No types found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metaobject target select if metaobject_reference */}
          {type === "metaobject_reference" && (
            <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
              <label className="mb-2 block text-sm font-medium text-purple-900">
                Target Metaobject Definition <span className="ml-1 text-red-500">*</span>
              </label>

              {loadingDefs ? (
                <div className="text-xs text-slate-500">Loading metaobjects...</div>
              ) : metaobjectDefs.length > 0 ? (
                <select
                  value={referenceMetaobjectDefinitionId}
                  onChange={(e) => setReferenceMetaobjectDefinitionId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-purple-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-purple-500"
                >
                  <option value="">Select a metaobject...</option>
                  {metaobjectDefs.map((def) => (
                    <option key={def.id} value={def.id}>
                      {def.name} ({def.type})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-purple-700">
                  No metaobject definitions found. Create a definition first in the{" "}
                  <strong>Meta Objects</strong> tab.
                </div>
              )}
            </div>
          )}

          {/* Validation Rules Section */}
          {(type === "single_line_text" ||
            type === "multi_line_text" ||
            type === "number_integer" ||
            type === "number_decimal") && (
            <div className="mb-5 rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Sliders size={14} />
                Validation Rules
              </div>

              {(type === "single_line_text" || type === "multi_line_text") && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Preset Choices (dropdown options)
                  </label>
                  <input
                    type="text"
                    value={choices}
                    onChange={(e) => setChoices(e.target.value)}
                    placeholder="e.g. Small, Medium, Large (comma separated)"
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Leave empty for open text, or provide comma-separated choices for a select dropdown.
                  </p>
                </div>
              )}

              {(type === "number_integer" || type === "number_decimal") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Minimum Value
                    </label>
                    <input
                      type="number"
                      value={minValue}
                      onChange={(e) => setMinValue(e.target.value)}
                      placeholder="e.g. 0"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Maximum Value
                    </label>
                    <input
                      type="number"
                      value={maxValue}
                      onChange={(e) => setMaxValue(e.target.value)}
                      placeholder="e.g. 100"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List Toggle */}
          <div className="mb-4 rounded-xl border border-slate-200 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isList}
                onChange={(e) => setIsList(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">List of values</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Allow this metafield to contain multiple values (array).
                </p>
              </div>
            </label>
          </div>

          {/* Required Toggle */}
          <div className="mb-5 rounded-xl border border-slate-200 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Required</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Require a value when editing this product.
                </p>
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                ? "Save changes"
                : "Create metafield"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}