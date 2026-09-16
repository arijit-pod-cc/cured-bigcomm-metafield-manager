import Link from "next/link";

export default function StatCard({
  label,
  value,
  href,
  linkText,
  valueClassName = "text-slate-900",
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-3xl font-semibold ${valueClassName}`}
      >
        {value}
      </p>

      {href && linkText ? (
        <Link
          href={href}
          className="mt-5 inline-flex text-sm font-medium text-slate-900 hover:underline"
        >
          {linkText} →
        </Link>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

