
import { Suspense } from "react";
import Header from "./Header";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white" />}>
        <Header />
      </Suspense>

      <Suspense fallback={<div className="mx-auto w-full max-w-7xl px-6 py-10" />}>
        <main className="mx-auto w-full max-w-7xl px-6 py-10">
          {children}
        </main>
      </Suspense>
    </div>
  );
}
