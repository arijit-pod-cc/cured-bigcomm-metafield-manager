import Image from "next/image";
import { Edit, BookOpen } from "lucide-react";

export default function BlogTable({
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
            <div className="h-11 w-11 rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-64 rounded bg-slate-100" />
              <div className="h-3 w-40 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <BookOpen
            size={22}
            className="text-slate-500"
          />
        </div>

        <h3 className="text-sm font-semibold text-slate-900">
          No blog posts found
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
              Blog Post
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              URL / Slug
            </th>

            <th className="w-24 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>

            <th className="w-24 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              ID
            </th>

            <th className="w-24 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {items.map((blog) => (
            <tr
              key={blog.id}
              className="group transition-colors hover:bg-slate-50"
            >
              {/* Blog Title & Thumbnail */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {blog.image ? (
                      <Image
                        src={blog.image}
                        alt={blog.name || "Blog"}
                        width={44}
                        height={44}
                        sizes="44px"
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = "/default_image.webp";
                        }}
                      />
                    ) : (
                      <Image
                        src="/default_image.webp"
                        alt={blog.name || "Blog"}
                        width={44}
                        height={44}
                        sizes="44px"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 max-w-md">
                    <p className="truncate text-sm font-medium text-slate-900 group-hover:text-slate-950">
                      {blog.name}
                    </p>
                  </div>
                </div>
              </td>

              {/* URL */}
              <td className="px-5 py-3.5">
                <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 truncate max-w-xs block">
                  {blog.sku || blog.url || "—"}
                </code>
              </td>

              {/* Status */}
              <td className="px-5 py-3.5 text-center">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    blog.is_published
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {blog.is_published ? "Published" : "Draft"}
                </span>
              </td>

              {/* ID */}
              <td className="px-5 py-3.5 text-right">
                <span className="text-xs text-slate-500 font-mono">
                  {blog.id}
                </span>
              </td>

              {/* Action */}
              <td className="px-5 py-3.5 text-right">
                <button
                  type="button"
                  title="Edit metafields"
                  onClick={() => onEdit(blog)}
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
