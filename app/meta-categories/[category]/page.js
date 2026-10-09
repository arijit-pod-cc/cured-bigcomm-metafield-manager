import ProductCategoryItems from "@/components/meta-categories/ProductCategoryItems";
import OrderCategoryItems from "@/components/meta-categories/OrderCategoryItems";
import VariantCategoryItems from "@/components/meta-categories/VariantCategoryItems";
import PagesCategoryItems from "@/components/meta-categories/PagesCategoryItems";
import BlogsCategoryItems from "@/components/meta-categories/BlogsCategoryItems";
import GenericCategoryItems from "@/components/meta-categories/GenericCategoryItems";

export default async function CategoryPage({ params, searchParams }) {
  const { category } = await params;
  const resolvedSearchParams = await searchParams;
  const context = resolvedSearchParams?.context || "";

  if (category === "products") {
    return <ProductCategoryItems category={category} context={context} />;
  }

  if (category === "orders") {
    return <OrderCategoryItems category={category} context={context} />;
  }

  if (category === "variants") {
    return <VariantCategoryItems category={category} context={context} />;
  }

  if (category === "pages") {
    return <PagesCategoryItems category={category} context={context} />;
  }

  if (category === "blogs") {
    return <BlogsCategoryItems category={category} context={context} />;
  }

  return <GenericCategoryItems category={category} context={context} />;
}