"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";
import { createMetaobjectDefinition } from "@/app/actions/metaobjects/createMetaobjectDefinition";
import { METAFIELD_TYPES } from "@/data/meta-types";

function generateSlug(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export default function NewMetaobjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") || "";

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [displayFieldKey, setDisplayFieldKey] = useState("");
  const [fields, setFields] = useState([
    {
      id: "f_1",
      name: "Name",
      key: "name",
      type: "single_line_text",
      isList: false,
      isRequired: true,
      description: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(val) {
    setName(val);
    if (!type || type === generateSlug(name)) {
      setType(generateSlug(val));
    }
  }

  function addField() {
    const newIdx = fields.length + 1;
    const newKey = `field_${newIdx}`;
    setFields([
      ...fields,
      {
        id: `f_${Date.now()}`,
        name: `Field ${newIdx}`,
        key: newKey,
        type: "single_line_text",
        isList: false,
        isRequired: false,
        description: "",
      },
    ]);
  }

  function removeField(idx) {
    if (fields.length <= 1) return;
    const updated = [...fields];
    updated.splice(idx, 1);
    setFields(updated);
  }

  function updateField(idx, prop, val) {
    const updated = [...fields];
    updated[idx] = { ...updated[idx], [prop]: val };
    if (prop === "name" && (!updated[idx].key || updated[idx].key.startsWith("field_"))) {
      updated[idx].key = generateSlug(val);
    }
    setFields(updated);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Metaobject name is required");
      return;
    }
    if (!type.trim()) {
      setError("Type identifier is required");
      return;
    }
    if (fields.length === 0) {
      setError("At least one field is required");
      return;
    }

    try {
      setSaving(true);
      await createMetaobjectDefinition(context, {
        name: name.trim(),
        type: generateSlug(type),
        description: description.trim(),
        displayFieldKey: displayFieldKey || fields[0]?.key || "name",
        fields,
      });

      const nextUrl = context
        ? `/meta-objects?context=${encodeURIComponent(context)}`
        : "/meta-objects";
      router.push(nextUrl);
    } catch (err) {
      console.error("Save error:", err);
      setError(err?.message || "Failed to create metaobject definition");
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    const nextUrl = context
      ? `/meta-objects?context=${encodeURIComponent(context)}`
      : "/meta-objects";
    router.push(nextUrl);
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create Metaobject Definition
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Define the schema and attributes for this reusable object.
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
          {saving ? "Creating..." : "Save Definition"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Definition Details Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
            <Database size={16} className="text-purple-600" />
            Basic Information
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Fabric Care, Warranty Policy, Designer"
                className="h-10 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Type / Handle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={type}
                onChange={(e) => setType(generateSlug(e.target.value))}
                placeholder="fabric_care"
                className="h-10 w-full rounded-xl border border-slate-300 font-mono text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this metaobject and where it is intended to be used..."
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>

        {/* Fields Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Layers size={16} className="text-purple-600" />
              Field Definitions ({fields.length})
            </div>
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
            >
              <Plus size={14} /> Add field
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex flex-col md:flex-row items-start md:items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-300"
              >
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Field Name
                    </label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(idx, "name", e.target.value)}
                      placeholder="Title"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Field Key
                    </label>
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) =>
                        updateField(idx, "key", generateSlug(e.target.value))
                      }
                      placeholder="title"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Type
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(idx, "type", e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none focus:border-purple-500"
                    >
                      {METAFIELD_TYPES.filter((t) => t.id !== "metaobject_reference").map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1 md:pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={field.isList}
                      onChange={(e) => updateField(idx, "isList", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600"
                    />
                    List
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={field.isRequired}
                      onChange={(e) => updateField(idx, "isRequired", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600"
                    />
                    Required
                  </label>

                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Remove field"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Display Field (Entry Title Label)
            </label>
            <select
              value={displayFieldKey}
              onChange={(e) => setDisplayFieldKey(e.target.value)}
              className="h-10 max-w-sm w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-purple-500"
            >
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.name} ({f.key})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              The field that identifies each entry in dropdowns and tables.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
