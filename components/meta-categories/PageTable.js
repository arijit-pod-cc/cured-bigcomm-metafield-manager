import { Edit, FileText } from "lucide-react";

export default function PageTable({
  items,
  loading,
  onEdit,
}) {
  if (loading) {
    return (
      <div className="divide-y divide-slate-100">
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="flex h-[72px] animate-pulse items-center gap-4 px-5"
          >
            <div className="h-4 w-64 rounded bg-slate-100" />
            <div className="h-4 w-48 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <FileText
            size={22}
            className="text-slate-500"
          />
        </div>

        <h3 className="text-sm font-semibold text-slate-900">
          No pages found
        </h3>

      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              URL
            </th>

            <th className="w-24 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {items.map((page) => (
            <tr
              key={page.id}
              className="group transition-colors hover:bg-slate-50"
            >
              {/* Name */}
              <td className="px-5 py-3.5">
                <p className="truncate text-sm font-medium text-slate-900">
                  {page.name}
                </p>
              </td>

              {/* URL */}
              <td className="px-5 py-3.5">
                <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                  {page.sku || "—"}
                </code>
              </td>

              {/* Action */}
              <td className="px-5 py-3.5 text-right">
                <button
                  type="button"
                  title="Edit metafields"
                  onClick={() => onEdit(page)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Edit size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
