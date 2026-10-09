"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Info,
  Upload,
  Loader2,
  ExternalLink,
  Package,
  Database,
  Layers,
  Image as ImageIcon,
} from "lucide-react";

import { fetchProductMetafields } from "@/app/actions/fetchProductMetafields";
import { saveProductMetafieldsBundle } from "@/app/actions/saveProductMetafieldsBundle";
import QuillEditor from "@/components/QuillEditor";
import ProductPickerModal from "@/components/pickers/ProductPickerModal";
import MetaobjectPickerModal from "@/components/pickers/MetaobjectPickerModal";
import VariantPickerModal from "@/components/pickers/VariantPickerModal";
import "@/app/globals-quill.css";

export default function ProductMetaEdit({ category, productId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";

  const [metafields, setMetafields] = useState([]);
  const [values, setValues] = useState({});
  const [originalValues, setOriginalValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states for pickers
  const [activePickerField, setActivePickerField] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!context) return;

      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const result = await fetchProductMetafields(
          category,
          String(productId),
          context
        );

        if (cancelled) return;

        const definitions = result?.metafields || [];
        setMetafields(definitions);

        const initialValues = {};
        definitions.forEach((metafield) => {
          if (metafield.isList) {
            initialValues[metafield.id] = Array.isArray(metafield.value)
              ? metafield.value
              : metafield.value
              ? [metafield.value]
              : [""];
          } else {
            initialValues[metafield.id] = metafield.value ?? "";
          }
        });

        setValues(initialValues);
        setOriginalValues(JSON.parse(JSON.stringify(initialValues)));
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load product metafields:", err);
        setError(err?.message || "Failed to load product metafields");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [category, productId, context]);

  function handleValueChange(definitionId, value) {
    setValues((prev) => ({
      ...prev,
      [definitionId]: value,
    }));
  }

  function handleListValueChange(definitionId, index, value) {
    setValues((prev) => {
      const current = Array.isArray(prev[definitionId])
        ? [...prev[definitionId]]
        : [""];
      current[index] = value;
      return {
        ...prev,
        [definitionId]: current,
      };
    });
  }

  function addListValue(definitionId) {
    setValues((prev) => {
      const current = Array.isArray(prev[definitionId])
        ? [...prev[definitionId]]
        : [];
      return {
        ...prev,
        [definitionId]: [...current, ""],
      };
    });
  }

  function removeListValue(definitionId, index) {
    setValues((prev) => {
      const current = Array.isArray(prev[definitionId])
        ? [...prev[definitionId]]
        : [];
      if (current.length <= 1) {
        return {
          ...prev,
          [definitionId]: [""],
        };
      }
      current.splice(index, 1);
      return {
        ...prev,
        [definitionId]: current,
      };
    });
  }

  function hasChanges() {
    return JSON.stringify(values) !== JSON.stringify(originalValues);
  }

  async function handleSaveAll() {
    if (!context) {
      setError("Missing app context. Please reload the app from BigCommerce.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const valuesToSave = {};
      Object.entries(values).forEach(([definitionId, value]) => {
        const metafield = metafields.find(
          (m) => String(m.id) === String(definitionId)
        );

        if (metafield && metafield.isList) {
          valuesToSave[definitionId] = Array.isArray(value)
            ? value.filter(
                (item) =>
                  item !== null &&
                  item !== undefined &&
                  String(item).trim() !== ""
              )
            : [];
        } else {
          valuesToSave[definitionId] = value;
        }
      });

      await saveProductMetafieldsBundle(
        category,
        String(productId),
        valuesToSave,
        metafields,
        context
      );

      setSuccess("All metafields saved successfully.");
      setOriginalValues(JSON.parse(JSON.stringify(values)));

      setTimeout(() => {
        setSuccess("");
      }, 3500);
    } catch (err) {
      console.error("Failed to save metafields:", err);
      setError(err?.message || "Failed to save metafields");
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    const target = `/meta-categories/${category}`;
    const nextUrl = context
      ? `${target}?context=${encodeURIComponent(context)}`
      : target;
    router.push(nextUrl);
  }

  function getCategoryName() {
    const categoryMap = {
      products: "Product",
      pages: "Page",
      blogs: "Blog",
      orders: "Order",
      customers: "Customer",
      variants: "Variant",
      categories: "Category",
      brands: "Brand",
    };
    return categoryMap[category] || category;
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {getCategoryName()} Metafields
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {getCategoryName()} ID: {productId}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {getCategoryName()} Metafields
              </h1>
              <span className="rounded-lg bg-slate-100 px-3 py-1 font-mono text-sm font-medium text-slate-600">
                ID: {productId}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Configure custom data for this {getCategoryName().toLowerCase()}.
            </p>
          </div>
        </div>

        {metafields.length > 0 && !loading && (
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || !hasChanges()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Save All"}
          </button>
        )}
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

      {metafields.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-8 py-20 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
            <Info className="text-slate-400" size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            No metafield definitions configured
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Create a metafield definition first from the category definitions page.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {metafields.map((metafield) => (
            <MetafieldCard
              key={metafield.id}
              metafield={metafield}
              value={values[metafield.id]}
              context={context}
              productId={productId}
              category={category}
              onChange={(value) => handleValueChange(metafield.id, value)}
              onListChange={(index, value) =>
                handleListValueChange(metafield.id, index, value)
              }
              onAddListValue={() => addListValue(metafield.id)}
              onRemoveListValue={(index) =>
                removeListValue(metafield.id, index)
              }
              onOpenPicker={(fieldDef, isListMode) => {
                setActivePickerField({
                  metafield: fieldDef,
                  isList: isListMode,
                });
              }}
            />
          ))}
        </div>
      )}

      {/* Product Picker Modal */}
      {activePickerField &&
        activePickerField.metafield.type === "product_reference" && (
          <ProductPickerModal
            open={true}
            context={context}
            isList={activePickerField.isList}
            selectedIds={values[activePickerField.metafield.id]}
            onClose={() => setActivePickerField(null)}
            onSelect={(selected) => {
              handleValueChange(activePickerField.metafield.id, selected);
              setActivePickerField(null);
            }}
          />
        )}

      {/* Metaobject Picker Modal */}
      {activePickerField &&
        activePickerField.metafield.type === "metaobject_reference" && (
          <MetaobjectPickerModal
            open={true}
            context={context}
            isList={activePickerField.isList}
            metaobjectDefinitionId={
              activePickerField.metafield.referenceMetaobjectDefinitionId
            }
            selectedIds={values[activePickerField.metafield.id]}
            onClose={() => setActivePickerField(null)}
            onSelect={(selected) => {
              handleValueChange(activePickerField.metafield.id, selected);
              setActivePickerField(null);
            }}
          />
        )}

      {/* Variant Picker Modal */}
      {activePickerField &&
        activePickerField.metafield.type === "variant_reference" && (
          <VariantPickerModal
            open={true}
            context={context}
            isList={activePickerField.isList}
            selectedIds={values[activePickerField.metafield.id]}
            onClose={() => setActivePickerField(null)}
            onSelect={(selected) => {
              handleValueChange(activePickerField.metafield.id, selected);
              setActivePickerField(null);
            }}
          />
        )}
    </div>
  );
}

function MetafieldCard({
  metafield,
  value,
  context,
  productId,
  category,
  onChange,
  onListChange,
  onAddListValue,
  onRemoveListValue,
  onOpenPicker,
}) {
  const type = metafield.type;
  const isList = Boolean(metafield.isList);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300">
      {/* Heading */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                {metafield.name}
                {metafield.isRequired && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </h2>

              {/* Type Badge */}
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {type}
              </span>

              {/* List Badge */}
              {isList && (
                <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                  List
                </span>
              )}

              {/* Identifier Badge */}
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                {metafield.namespace}.{metafield.key || metafield.namespace}
              </span>
            </div>

            {metafield.description && (
              <p className="mt-1 text-xs text-slate-500">
                {metafield.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Field Input */}
      <div className="mt-4">
        {renderMetafieldInput({
          metafield,
          value,
          context,
          productId,
          category,
          onChange,
          onListChange,
          onAddListValue,
          onRemoveListValue,
          onOpenPicker,
        })}
      </div>
    </section>
  );
}

function renderMetafieldInput({
  metafield,
  value,
  context,
  productId,
  category,
  onChange,
  onListChange,
  onAddListValue,
  onRemoveListValue,
  onOpenPicker,
}) {
  const type = metafield.type;
  const isList = Boolean(metafield.isList);

  // If it's a reference type in list mode, we can show a picker button or repeater
  if (
    isList &&
    (type === "product_reference" ||
      type === "metaobject_reference" ||
      type === "variant_reference")
  ) {
    const listValues = Array.isArray(value)
      ? value.filter(Boolean)
      : value
      ? [value]
      : [];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {listValues.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-800"
            >
              {type === "product_reference" ? (
                <Package size={15} className="text-blue-600" />
              ) : type === "variant_reference" ? (
                <Layers size={15} className="text-emerald-600" />
              ) : (
                <Database size={15} className="text-purple-600" />
              )}
              <span className="font-mono text-xs">
                {type === "variant_reference" ? `Variant: ${item}` : `ID: ${item}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  const updated = [...listValues];
                  updated.splice(idx, 1);
                  onChange(updated);
                }}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {listValues.length === 0 && (
            <div className="text-xs text-slate-400 italic py-1">
              No items selected yet.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenPicker(metafield, true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Plus size={14} />
          Select{" "}
          {type === "product_reference"
            ? "Products"
            : type === "variant_reference"
            ? "Variants"
            : "Metaobject Entries"}
        </button>
      </div>
    );
  }

  // General List repeater
  if (isList) {
    const listValues = Array.isArray(value) ? value : [""];

    return (
      <div className="space-y-3">
        {listValues.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-1">
              {renderSingleInput({
                metafield,
                type,
                value: item,
                context,
                productId,
                category,
                onChange: (newValue) => onListChange(index, newValue),
                onOpenPicker: () => onOpenPicker(metafield, false),
              })}
            </div>

            <button
              type="button"
              onClick={() => onRemoveListValue(index)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              title="Remove item"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddListValue}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <Plus size={14} />
          Add value
        </button>
      </div>
    );
  }

  return renderSingleInput({
    metafield,
    type,
    value,
    context,
    productId,
    category,
    onChange,
    onOpenPicker: () => onOpenPicker(metafield, false),
  });
}

function renderSingleInput({
  metafield,
  type,
  value,
  context,
  productId,
  category,
  onChange,
  onOpenPicker,
}) {
  const commonClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  // Check choices validation preset
  if (
    metafield?.validations?.choices &&
    Array.isArray(metafield.validations.choices) &&
    metafield.validations.choices.length > 0 &&
    (type === "single_line_text" || type === "multi_line_text")
  ) {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={commonClass}
      >
        <option value="">Select an option...</option>
        {metafield.validations.choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    );
  }

  switch (type) {
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
          min={metafield?.validations?.min}
          max={metafield?.validations?.max}
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
          min={metafield?.validations?.min}
          max={metafield?.validations?.max}
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
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          <span className="text-sm font-medium text-slate-700">Enable</span>
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
        <FileUploadField
          value={value}
          onChange={onChange}
          context={context}
          category={category}
          productId={productId}
        />
      );

    case "product_reference":
      return (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Product ID..."
              className={commonClass}
            />
          </div>
          <button
            type="button"
            onClick={onOpenPicker}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 border border-blue-200 transition hover:bg-blue-100"
          >
            <Package size={14} />
            Search Catalog
          </button>
        </div>
      );

    case "variant_reference":
      return (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Variant ID (e.g. 452)..."
              className={commonClass}
            />
          </div>
          <button
            type="button"
            onClick={onOpenPicker}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200 transition hover:bg-emerald-100"
          >
            <Layers size={14} />
            Select Variant
          </button>
        </div>
      );

    case "metaobject_reference":
      return (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Metaobject Entry ID..."
              className={commonClass}
            />
          </div>
          <button
            type="button"
            onClick={onOpenPicker}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 border border-purple-200 transition hover:bg-purple-100"
          >
            <Database size={14} />
            Browse Entries
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

function FileUploadField({ value, onChange, context, category, productId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const url = typeof value === "string" ? value : "";

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category || "products");
      formData.append("itemId", String(productId || "default"));
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
          {/* Thumbnail preview if image */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img
              src={url}
              alt="Uploaded file"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-mono text-slate-700">{url}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              View file <ExternalLink size={12} />
            </a>
          </div>

          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            title="Remove file"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            {uploading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? "Uploading to WebDAV..." : "Upload File"}
            <input
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <span className="text-xs text-slate-400">or enter direct URL:</span>

          <input
            type="text"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
          />
        </div>
      )}

      {uploadError && (
        <p className="text-xs font-medium text-red-600">{uploadError}</p>
      )}
    </div>
  );
}