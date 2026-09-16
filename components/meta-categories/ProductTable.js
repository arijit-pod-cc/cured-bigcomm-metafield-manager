import Image from "next/image";
import { Edit, Package } from "lucide-react";

export default function ProductTable({
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

            <div className="h-4 w-64 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Package
            size={22}
            className="text-slate-500"
          />
        </div>

        <h3 className="text-sm font-semibold text-slate-900">
          No products found
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
              Product
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
          {items.map((product) => (
            <tr
              key={product.id}
              className="group transition-colors hover:bg-slate-50"
            >
              {/* Product */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">

                  {/* Image */}
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">

                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name || "Product"}
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
                        alt={product.name || "Product"}
                        width={44}
                        height={44}
                        sizes="44px"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  {/* Name */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {product.name}
                    </p>

                    {(product.sku || typeof product.variantCount === "number") && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {product.sku ? `SKU: ${product.sku}` : "SKU: N/A"}
                        {typeof product.variantCount === "number" ? ` | Variants: ${product.variantCount}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </td>

              {/* ID */}
              <td className="px-5 py-3.5 text-right text-sm text-slate-500">
                {product.id}
              </td>

              {/* Action */}
              <td className="px-5 py-3.5 text-right">
                <button
                  type="button"
                  title="Edit metafields"
                  onClick={() => onEdit(product)}
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