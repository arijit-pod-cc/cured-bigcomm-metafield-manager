
export default function ConnectionStatus() {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />

      <span className="text-xs font-medium text-slate-600">
        Connected
      </span>
    </div>
  );
}

