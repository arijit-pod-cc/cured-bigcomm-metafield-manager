export function withContextParam(pathname, searchParams) {
  const url = new URL(pathname, "http://localhost");
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams || "");

  const context = params.get("context");

  if (context) {
    url.searchParams.set("context", context);
  }

  return `${url.pathname}${url.search}`;
}
