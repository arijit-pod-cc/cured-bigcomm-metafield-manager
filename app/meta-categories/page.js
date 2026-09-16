import { Info } from "lucide-react";
import MetaCategoryList from "@/components/meta-categories/MetaCategoryList";

export default function MetaCategoriesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Metafield definitions
            </h1>

            <Info
              size={18}
              strokeWidth={1.8}
              className="text-slate-500"
            />
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Add a custom piece of data to a specific part of your store.
          </p>
        </div>

        {/* Category List */}
        <MetaCategoryList />

      </section>
    </div>
  );
}