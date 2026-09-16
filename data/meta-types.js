export const METAFIELD_TYPES = [
  // Text Types
  {
    id: "single_line_text",
    name: "Single line text",
    category: "Text",
    description: "A short text field",
  },
  {
    id: "multi_line_text",
    name: "Multi-line text",
    category: "Text",
    description: "A longer text field",
  },
  {
    id: "rich_text",
    name: "Rich text",
    category: "Text",
    description: "Formatted text with styling",
  },

  // Number Types
  {
    id: "number_integer",
    name: "Integer",
    category: "Number",
    description: "Whole numbers",
  },
  {
    id: "number_decimal",
    name: "Decimal",
    category: "Number",
    description: "Numbers with decimals",
  },

  // Date Types
  {
    id: "date",
    name: "Date",
    category: "Date",
    description: "Date without time",
  },
  {
    id: "date_time",
    name: "Date and time",
    category: "Date",
    description: "Date with time",
  },

  // Other Types
  {
    id: "boolean",
    name: "Boolean",
    category: "Other",
    description: "True or false",
  },
  {
    id: "url",
    name: "URL",
    category: "Other",
    description: "Web address",
  },
  {
    id: "color",
    name: "Color",
    category: "Other",
    description: "Color value",
  },
  {
    id: "json",
    name: "JSON",
    category: "Other",
    description: "JSON data",
  },
  {
    id: "file",
    name: "File",
    category: "Other",
    description: "File upload",
  },

  // Reference Types
  {
    id: "product_reference",
    name: "Product reference",
    category: "Reference",
    description: "Link to a BigCommerce product",
  },
  {
    id: "variant_reference",
    name: "Variant reference",
    category: "Reference",
    description: "Link to a product variant",
  },
  {
    id: "category_reference",
    name: "Category reference",
    category: "Reference",
    description: "Link to a category",
  },
  {
    id: "customer_reference",
    name: "Customer reference",
    category: "Reference",
    description: "Link to a customer",
  },
  {
    id: "order_reference",
    name: "Order reference",
    category: "Reference",
    description: "Link to an order",
  },
  {
    id: "metaobject_reference",
    name: "Metaobject reference",
    category: "Reference",
    description: "Link to a metaobject entry",
  },
];

export const METAFIELD_TYPES_BY_CATEGORY = METAFIELD_TYPES.reduce((acc, type) => {
  if (!acc[type.category]) {
    acc[type.category] = [];
  }
  acc[type.category].push(type);
  return acc;
}, {});
