import ProductMetaEdit from "@/components/meta-categories/ProductMetaEdit";

export default async function CategoryItemPage({ params }) {
  const { category, id } = await params;

  if (category === "products" || category === "pages" || category === "blogs") {
    return (
      <ProductMetaEdit
        category={category}
        productId={String(id)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          {category} metafields
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Metafield editing for this category is not available yet.
        </p>
      </div>
    </div>
  );
}