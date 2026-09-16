import { ChevronRight } from "lucide-react";
import Link from "next/link";
export default function MetaCategoryRow({
  icon: Icon,
  name,
  count = 0,
  href = "#",
}) {
  return (
    <Link href={href} className="group flex min-h-[56px] items-center border-b border-slate-200 px-2 transition-colors last:border-b-0 hover:bg-slate-50">
      {/* Icon */}
      <div className="flex w-10 shrink-0 items-center justify-center text-slate-600">
        <Icon size={20} strokeWidth={1.8} />
      </div>

      {/* Name */}
      <div className="flex-1">
        <span className="text-[15px] font-medium text-slate-800">
          {name}
        </span>
      </div>

      {/* Count */}
      {/* <div className="mr-4 min-w-[30px] text-right text-sm text-slate-800">
        {count}
      </div> */}

      {/* Arrow */}
      <div className="flex w-6 items-center justify-center text-slate-500 transition-transform group-hover:translate-x-0.5">
        <ChevronRight size={20} strokeWidth={1.8} />
      </div>
    </Link>
  );
}