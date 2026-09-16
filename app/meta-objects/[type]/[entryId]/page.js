"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  Loader2,
  ExternalLink,
  Package,
  Database,
} from "lucide-react";

import { getMetaobjectEntry } from "@/app/actions/metaobjects/getMetaobjectEntry";
import { saveMetaobjectEntry } from "@/app/actions/metaobjects/saveMetaobjectEntry";
import QuillEditor from "@/components/QuillEditor";
import ProductPickerModal from "@/components/pickers/ProductPickerModal";
import MetaobjectPickerModal from "@/components/pickers/MetaobjectPickerModal";
import "@/app/globals-quill.css";

function generateSlug(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function MetaobjectEntryEditorPage({ params, type: propType, entryId: propEntryId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";

  const unwrapped = params ? use(params) : {};
  const type = propType || unwrapped.type;
  const entryId = propEntryId || unwrapped.entryId;

  const isNew = entryId === "new";

  const [definition, setDefinition] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState("active");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal pickers
  const [activePickerField, setActivePickerField] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!context || !type) return;

      try {
        setLoading(true);
        setError("");
        const res = await getMetaobjectEntry(context, type, entryId);

        if (cancelled) return;

        setDefinition(res?.definition || null);
        setFields(res?.fields || []);

        const initialValues = {};
        (res?.fields || []).forEach((f) => {
          if (f.isList) {
            initialValues[f.id] = Array.isArray(res?.values?.[f.id])
              ? res.values[f.id]
              : res?.values?.[f.id]
              ? [res.values[f.id]]
              : [""];
          } else {
            initialValues[f.id] = res?.values?.[f.id] ?? "";
          }
        });

        setValues(initialValues);

        if (res?.entry) {
          setDisplayName(res.entry.displayName || "");
          setHandle(res.entry.handle || "");
          setStatus(res.entry.status || "active");
        } else {
          setDisplayName("");
          setHandle("");
          setStatus("active");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load metaobject entry:", err);
        setError(err?.message || "Failed to load entry");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [type, entryId, context]);

  function handleFieldChange(fieldId, val) {
    setValues((prev) => ({
      ...prev,
      [fieldId]: val,
    }));

    // If changing the field that acts as displayFieldKey, auto-update displayName and handle if new
    const field = fields.find((f) => f.id === fieldId);
    if (field && field.key === definition?.displayFieldKey && isNew) {
      const displayVal = Array.isArray(val) ? val.join(", ") : String(val || "");
      setDisplayName(displayVal);
      setHandle(generateSlug(displayVal));
    }
  }

  function handleListChange(fieldId, index, val) {
    setValues((prev) => {
      const current = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [""];
      current[index] = val;
      return { ...prev, [fieldId]: current };
    });
  }

  function addListValue(fieldId) {
    setValues((prev) => {
      const current = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      return { ...prev, [fieldId]: [...current, ""] };
    });
  }

  function removeListValue(fieldId, index) {
    setValues((prev) => {
      const current = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      if (current.length <= 1) return { ...prev, [fieldId]: [""] };
      current.splice(index, 1);
      return { ...prev, [fieldId]: current };
    });
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    if (!context) {
      setError("Missing context token");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Filter empty list items
      const cleanedValues = {};
      Object.entries(values).forEach(([fid, val]) => {
        const field = fields.find((f) => String(f.id) === String(fid));
        if (field && field.isList) {
          cleanedValues[fid] = Array.isArray(val)
            ? val.filter((item) => item !== null && item !== undefined && String(item).trim() !== "")
            : [];
        } else {
          cleanedValues[fid] = val;
        }
      });

      const res = await saveMetaobjectEntry(context, type, {
        id: isNew ? null : entryId,
        displayName: displayName.trim(),
        handle: generateSlug(handle || displayName),
        status,
        values: cleanedValues,
      });

      setSuccess("Entry saved successfully!");

      if (isNew && res?.entryId) {
        const nextUrl = context
          ? `/meta-objects/${type}/${res.entryId}?context=${encodeURIComponent(context)}`
          : `/meta-objects/${type}/${res.entryId}`;
        router.replace(nextUrl);
      } else {
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Save error:", err);
      setError(err?.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    const nextUrl = context
      ? `/meta-objects/${type}?context=${encodeURIComponent(context)}`
      : `/meta-objects/${type}`;
    router.push(nextUrl);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm">Loading entry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isNew ? `Add ${definition?.name || "Entry"}` : displayName || `Entry #${entryId}`}
              </h1>
              <span className="rounded-lg bg-purple-50 px-2.5 py-0.5 font-mono text-xs font-medium text-purple-700 border border-purple-200">
                {type}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {isNew ? "Populate fields to create a reusable entry." : `Editing entry handle: ${handle}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Entry"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Entry Metadata Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
            <Database size={16} className="text-purple-600" />
            Entry Metadata
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (isNew) setHandle(generateSlug(e.target.value));
                }}
                placeholder="e.g. 100% Organic Cotton, 2-Year Gold Warranty"
                className="h-10 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-purple-500"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Handle (URL / GraphQL slug)
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(generateSlug(e.target.value))}
                placeholder="organic-cotton"
                className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 font-mono text-sm outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Fields Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
            Fields ({fields.length})
          </div>

          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-800">
                    {field.name}
                    {field.isRequired && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                      {field.key}
                    </span>
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                      {field.type}
                    </span>
                    {field.isList && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        List
                      </span>
                    )}
                  </div>
                </div>

                {field.description && (
                  <p className="text-xs text-slate-500">{field.description}</p>
                )}

                {/* Field input */}
                <div>
                  {renderEntryFieldInput({
                    field,
                    value: values[field.id],
                    context,
                    type,
                    entryId,
                    onChange: (val) => handleFieldChange(field.id, val),
                    onListChange: (idx, val) => handleListChange(field.id, idx, val),
                    onAddListValue: () => addListValue(field.id),
                    onRemoveListValue: (idx) => removeListValue(field.id, idx),
                    onOpenPicker: (isList) =>
                      setActivePickerField({ field, isList }),
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>

      {/* Product Picker Modal */}
      {activePickerField && activePickerField.field.type === "product_reference" && (
        <ProductPickerModal
          open={true}
          context={context}
          isList={activePickerField.isList}
          selectedIds={values[activePickerField.field.id]}
          onClose={() => setActivePickerField(null)}
          onSelect={(selected) => {
            handleFieldChange(activePickerField.field.id, selected);
            setActivePickerField(null);
          }}
        />
      )}

      {/* Metaobject Picker Modal */}
      {activePickerField && activePickerField.field.type === "metaobject_reference" && (
        <MetaobjectPickerModal
          open={true}
          context={context}
          isList={activePickerField.isList}
          metaobjectDefinitionId={activePickerField.field.referenceMetaobjectDefinitionId}
          selectedIds={values[activePickerField.field.id]}
          onClose={() => setActivePickerField(null)}
          onSelect={(selected) => {
            handleFieldChange(activePickerField.field.id, selected);
            setActivePickerField(null);
          }}
        />
      )}
    </div>
  );
}

function renderEntryFieldInput({
  field,
  value,
  context,
  type,
  entryId,
  onChange,
  onListChange,
  onAddListValue,
  onRemoveListValue,
  onOpenPicker,
}) {
  const commonClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100";

  if (field.isList) {
    const listValues = Array.isArray(value) ? value : [""];

    return (
      <div className="space-y-3">
        {listValues.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="flex-1">
              {renderSingleEntryInput({
                field,
                value: item,
                context,
                type,
                entryId,
                onChange: (newVal) => onListChange(idx, newVal),
                onOpenPicker: () => onOpenPicker(false),
              })}
            </div>
            <button
              type="button"
              onClick={() => onRemoveListValue(idx)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAddListValue}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          <Plus size={14} /> Add value
        </button>
      </div>
    );
  }

  return renderSingleEntryInput({
    field,
    value,
    context,
    type,
    entryId,
    onChange,
    onOpenPicker: () => onOpenPicker(false),
  });
}

function renderSingleEntryInput({
  field,
  value,
  context,
  type,
  entryId,
  onChange,
  onOpenPicker,
}) {
  const commonClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100";

  // Check choices preset
  if (
    field.validations?.choices &&
    Array.isArray(field.validations.choices) &&
    field.validations.choices.length > 0 &&
    (field.type === "single_line_text" || field.type === "multi_line_text")
  ) {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={commonClass}
      >
        <option value="">Select an option...</option>
        {field.validations.choices.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    );
  }

  switch (field.type) {
    case "single_line_text":
      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter text..."
          className={commonClass}
        />
      );

    case "multi_line_text":
      return (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter text..."
          rows={4}
          className={`${commonClass} resize-y`}
        />
      );

    case "rich_text":
      return (
        <QuillEditor
          value={value}
          onChange={onChange}
          placeholder="Enter rich text..."
        />
      );

    case "number_integer":
      return (
        <input
          type="number"
          step="1"
          min={field.validations?.min}
          max={field.validations?.max}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter integer..."
          className={commonClass}
        />
      );

    case "number_decimal":
      return (
        <input
          type="number"
          step="any"
          min={field.validations?.min}
          max={field.validations?.max}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter decimal number..."
          className={commonClass}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={commonClass}
        />
      );

    case "date_time":
      return (
        <input
          type="datetime-local"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={commonClass}
        />
      );

    case "boolean":
      return (
        <label className="inline-flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-purple-600"
          />
          <span className="text-sm font-medium text-slate-700">Enabled / Yes</span>
        </label>
      );

    case "url":
      return (
        <input
          type="url"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className={commonClass}
        />
      );

    case "color":
      return (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-slate-300 p-1"
          />
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className={commonClass}
          />
        </div>
      );

    case "json":
      return (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder='{"key": "value"}'
          rows={5}
          className={`${commonClass} resize-y font-mono text-xs`}
        />
      );

    case "file":
      return (
        <MetaobjectFileUploader
          value={value}
          onChange={onChange}
          context={context}
          type={type}
          entryId={entryId}
        />
      );

    case "product_reference":
      return (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Product ID..."
            className={commonClass}
          />
          <button
            type="button"
            onClick={onOpenPicker}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100"
          >
            <Package size={14} /> Search Catalog
          </button>
        </div>
      );

    case "metaobject_reference":
      return (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Metaobject Entry ID..."
            className={commonClass}
          />
          <button
            type="button"
            onClick={onOpenPicker}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-xs font-semibold text-purple-700 border border-purple-200 hover:bg-purple-100"
          >
            <Database size={14} /> Browse Entries
          </button>
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter value..."
          className={commonClass}
        />
      );
  }
}

function MetaobjectFileUploader({ value, onChange, context, type, entryId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const url = typeof value === "string" ? value : "";

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", `metaobjects/${type}`);
      formData.append("itemId", String(entryId || "new"));
      formData.append("context", context);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload file");
      }

      onChange(data.url);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {url ? (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img
              src={url}
              alt="Uploaded asset"
              className="h-full w-full object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-slate-700">{url}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:underline"
            >
              View file <ExternalLink size={12} />
            </a>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
            {uploading ? "Uploading..." : "Upload File"}
            <input type="file" onChange={handleFile} disabled={uploading} className="hidden" />
          </label>
          <span className="text-xs text-slate-400">or enter URL:</span>
          <input
            type="text"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-purple-500"
          />
        </div>
      )}
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
    </div>
  );
}
