"use client";

import { use } from "react";
import MetaobjectEntryEditorPage from "../[entryId]/page";

export default function NewEntryPage({ params }) {
  const { type } = use(params);
  return <MetaobjectEntryEditorPage type={type} entryId="new" />;
}
