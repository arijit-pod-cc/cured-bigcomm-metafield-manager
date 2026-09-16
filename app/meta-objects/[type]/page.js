import MetaobjectEntriesClient from "./MetaobjectEntriesClient";

export default async function MetaobjectEntriesPage({ params }) {
  const { type } = await params;
  return <MetaobjectEntriesClient type={type} />;
}
