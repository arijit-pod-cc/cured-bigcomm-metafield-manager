# Metafields & Metaobjects Implementation Log

This document records every file created or modified during the implementation of the Shopify-parity Product Metafields and Metaobjects engine, including the exact rationale and technical details for each change.

---

## 1. Database & Schema Alignment

### [`lib/dbs/mysql.js`](lib/dbs/mysql.js)
- **Action**: Modified
- **What Was Changed**:
  - Added `ensureSchema()` auto-migration runner using safe `CREATE TABLE IF NOT EXISTS` and `SHOW COLUMNS FROM` checks.
  - Wrapped `query(sql, values)` to ensure `await ensureSchema()` runs before any database queries execute.
- **Reason**:
  - Automatically provisions the MySQL database with missing tables (`metaobject_definitions`, `metaobject_field_definitions`, `metaobject_entries`, `metaobject_field_values`) and missing columns on `metafield_definitions` (`key`, `validationsJson`, `defaultValueJson`, `visibility`, `sortOrder`) without requiring manual SQL migration scripts.

### [`data/meta-types.js`](data/meta-types.js)
- **Action**: Modified
- **What Was Changed**:
  - Uncommented and enabled all reference types: `product_reference`, `variant_reference`, `category_reference`, `customer_reference`, `order_reference`, and `metaobject_reference`.
- **Reason**:
  - Reference types were previously commented out in the codebase. Enabling them allows definitions to link to products, variants, and metaobject entries.

---

## 2. Metafields Server Actions

### [`app/actions/createMetafield.js`](app/actions/createMetafield.js)
- **Action**: Modified
- **What Was Changed**:
  - Added support for `key`, configurable `namespace` (defaults to `"custom"`), `validationsJson`, and `defaultValueJson`.
  - Updated uniqueness validation from checking only `namespace` to checking `(storeHash, category, namespace, key)` and `name`.
- **Reason**:
  - Shopify identifies metafields by `namespace.key` (e.g., `custom.care_instructions`). Previously, the code only saved `namespace` slugified from the name, preventing distinct key naming and validation rules.

### [`app/actions/updateMetafield.js`](app/actions/updateMetafield.js)
- **Action**: Modified
- **What Was Changed**:
  - Added `key`, `validationsJson`, and `defaultValueJson` parameters to the update query and duplicate check.
- **Reason**:
  - Allows merchants to edit existing metafield definitions while preserving their `key` and validation rules.

### [`app/actions/fetchMetafields.js`](app/actions/fetchMetafields.js)
- **Action**: Modified
- **What Was Changed**:
  - Added `key`, `validationsJson`, `defaultValueJson`, `visibility`, and `sortOrder` to the SELECT query.
  - Added `key` to search filtering.
- **Reason**:
  - Required to display full `namespace.key` identifiers and pass validation rules to UI components.

### [`app/actions/getMetafield.js`](app/actions/getMetafield.js)
- **Action**: Modified
- **What Was Changed**:
  - Added `key`, `validationsJson`, `defaultValueJson`, `visibility`, and `sortOrder` to the query.
- **Reason**:
  - Populates the edit modal with the definition's key and validation rules.

### [`app/actions/fetchProductMetafields.js`](app/actions/fetchProductMetafields.js)
- **Action**: Modified
- **What Was Changed**:
  - Added `key`, `validationsJson`, and `defaultValueJson` to definition queries.
  - Enhanced bundle lookup to match values by `definition.key`, `definition.namespace`, or compound `namespace.key`.
- **Reason**:
  - Ensures 100% backwards compatibility with legacy product bundles while seamlessly supporting new `key`-based bundles.

### [`app/actions/saveProductMetafieldsBundle.js`](app/actions/saveProductMetafieldsBundle.js)
- **Action**: Modified
- **What Was Changed**:
  - Bundles values using both `key` and `namespace.key`.
  - Integrated `syncProductMetafieldsToBigCommerce` to trigger on every save when `category === "products"`.
- **Reason**:
  - Saves the bundle locally in MySQL and automatically pushes native metafields to BigCommerce with `read_and_sf_access`.

---

## 3. WebDAV File & Image Upload

### [`lib/webdav.js`](lib/webdav.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Implemented WebDAV client with HTTP Basic Auth using credentials from `.env.local`.
  - Added `ensureDirectoryExists` using `MKCOL` requests under `/content/metafields/{category}/{itemId}/`.
  - Uploads files via HTTP `PUT` and generates public BigCommerce CDN URLs (`https://store-.../content/metafields/...`).
- **Reason**:
  - Previously, `<input type="file">` serialized to `{}` during JSON save and files were never persisted. WebDAV stores them permanently on the store's CDN.

### [`app/api/upload/route.js`](app/api/upload/route.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Created `POST /api/upload` route that receives `multipart/form-data` and delegates file uploading to `lib/webdav.js`.
- **Reason**:
  - Provides an endpoint for UI components to upload images/documents asynchronously and receive a public CDN URL.

---

## 4. BigCommerce Native Storefront Sync & APIs

### [`lib/bigcommerce-metafields-sync.js`](lib/bigcommerce-metafields-sync.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Implemented `syncProductMetafieldsToBigCommerce`.
  - Fetches existing product metafields from `/v3/catalog/products/{id}/metafields`.
  - Creates or updates native metafields with `permission_set: "read_and_sf_access"`.
  - Syncs a master bundle metafield under `namespace: "metafields_app"`, `key: "bundle"`.
- **Reason**:
  - Previously, saved values only existed in MySQL. Syncing makes data directly available in Stencil theme Handlebars (`{{#each product.metafields}}`).

### [`app/api/storefront/metafields/route.js`](app/api/storefront/metafields/route.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Implemented public CORS-enabled GET route: `/api/storefront/metafields?productId={id}&storeHash={hash}`.
- **Reason**:
  - Allows headless storefronts, theme JS widgets, or external apps to query product metafield bundles with CORS and caching headers.

### [`app/api/storefront/metaobjects/route.js`](app/api/storefront/metaobjects/route.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Implemented public CORS-enabled GET route: `/api/storefront/metaobjects?type={type}&handle={handle}&storeHash={hash}`.
- **Reason**:
  - Enables dynamic storefront access to metaobject definitions and entries.

---

## 5. Metaobjects Engine

### Server Actions under [`app/actions/metaobjects/`](app/actions/metaobjects/)
- **[`createMetaobjectDefinition.js`](app/actions/metaobjects/createMetaobjectDefinition.js)**: Creates a new metaobject definition and its field definitions in MySQL.
- **[`fetchMetaobjectDefinitions.js`](app/actions/metaobjects/fetchMetaobjectDefinitions.js)**: Lists definitions along with entry counts and field counts.
- **[`getMetaobjectDefinition.js`](app/actions/metaobjects/getMetaobjectDefinition.js)**: Fetches definition details and field schemas.
- **[`deleteMetaobjectDefinition.js`](app/actions/metaobjects/deleteMetaobjectDefinition.js)**: Deletes a definition and cascades deletion to entries and field values.
- **[`fetchMetaobjectEntries.js`](app/actions/metaobjects/fetchMetaobjectEntries.js)**: Lists entries for a specific metaobject definition.
- **[`getMetaobjectEntry.js`](app/actions/metaobjects/getMetaobjectEntry.js)**: Fetches entry details and its populated field values.
- **[`saveMetaobjectEntry.js`](app/actions/metaobjects/saveMetaobjectEntry.js)**: Inserts or updates an entry and its values in `metaobject_field_values`.
- **[`deleteMetaobjectEntry.js`](app/actions/metaobjects/deleteMetaobjectEntry.js)**: Deletes an entry and its associated field values.
- **Reason**: Provides complete CRUD operations for the Metaobjects subsystem.

### User Interface Pages under [`app/meta-objects/`](app/meta-objects/)
- **[`app/meta-objects/page.js`](app/meta-objects/page.js)**: Replaced placeholder with the Metaobjects dashboard showing all definitions, field counts, entry counts, and actions.
- **[`app/meta-objects/new/page.js`](app/meta-objects/new/page.js)**: Interactive schema builder allowing merchants to add custom fields, set types/lists/requirements, and choose a display field key.
- **[`app/meta-objects/[type]/page.js`](app/meta-objects/[type]/page.js)**: Async server component that awaits `params` and passes `type` to `MetaobjectEntriesClient`.
- **[`app/meta-objects/[type]/MetaobjectEntriesClient.js`](app/meta-objects/[type]/MetaobjectEntriesClient.js)**: Client component rendering entries table with search, status badges, and actions.
- **[`app/meta-objects/[type]/new/page.js`](app/meta-objects/[type]/new/page.js)**: Fixed using `React.use(params)` to pass `type` and `entryId="new"` to avoid Next.js 15+ sync dynamic API errors.
- **[`app/meta-objects/[type]/[entryId]/page.js`](app/meta-objects/[type]/[entryId]/page.js)**: Dynamic entry editor rendering the appropriate inputs for each field in the metaobject's schema.
- **Reason**: Delivers the full Shopify-equivalent Metaobjects management experience in BigCommerce.

---

## 6. Interactive Pickers & UI Polish

### [`components/pickers/ProductPickerModal.js`](components/pickers/ProductPickerModal.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Modal with live catalog search, thumbnail previews, and SKU display for single or multi-select (`isList`).
- **Reason**:
  - Replaces raw text ID inputs with interactive product selection.

### [`components/pickers/MetaobjectPickerModal.js`](components/pickers/MetaobjectPickerModal.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Modal displaying entries of the target metaobject with search by display name or handle.
- **Reason**:
  - Allows merchants to select metaobject entries visually instead of typing ID numbers.

### [`components/meta-categories/AddMetafieldModal.js`](components/meta-categories/AddMetafieldModal.js)
- **Action**: Modified
- **What Was Changed**:
  - Added Namespace & Key inputs with identifier preview (`namespace.key`).
  - Added validation rules inputs (preset choices for single-line text, min/max for numbers).
  - Added dynamic dropdown to choose target metaobject when `metaobject_reference` is selected.
- **Reason**:
  - Conforms to Shopify's definition creation flow and validation capabilities.

### [`components/meta-categories/ProductMetaEdit.js`](components/meta-categories/ProductMetaEdit.js)
- **Action**: Modified
- **What Was Changed**:
  - Added WebDAV file upload with thumbnail preview, file link, and remove button.
  - Added product and metaobject picker modal triggers.
  - Added preset choices dropdown rendering for fields configured with choices.
  - Added number min/max constraints.
- **Reason**:
  - Provides a complete, user-friendly editing experience for all data types.

### [`app/meta-categories/[category]/metafields/page.js`](app/meta-categories/[category]/metafields/page.js)
- **Action**: Modified
- **What Was Changed**:
  - Displays full `namespace.key` in the table.
  - Added a "Theme Code" button (`<Code />`) opening a modal with ready-to-use BigCommerce Stencil Handlebars code and Storefront REST API code.
- **Reason**:
  - Empowers merchants and developers to immediately copy and paste theme code into Cornerstone/Stencil templates.

### [`app/actions/fetchDashboardStats.js`](app/actions/fetchDashboardStats.js) & [`components/dashboard/DashboardStats.js`](components/dashboard/DashboardStats.js)
- **Action**: Created & Modified
- **What Was Changed**:
  - Created server action to count active categories and metaobject definitions.
  - Updated dashboard cards to show real live counts instead of hardcoded `"0"`.
- **Reason**:
  - Provides accurate store metrics on the home dashboard.

---

## 7. Bug Fix: Next.js 15+ Dynamic API (`params.type`)

### [`app/meta-objects/[type]/page.js`](app/meta-objects/[type]/page.js) & [`app/meta-objects/[type]/new/page.js`](app/meta-objects/[type]/new/page.js)
- **Action**: Bug Fix
- **Error**: `A param property was accessed directly with params.type. params is a Promise and must be unwrapped with React.use() before accessing its properties.`
- **Cause**: Next.js 15+ marks `params` as a Promise on dynamic routes. In `new/page.js`, `params.type` was accessed synchronously.
- **Fix**:
  - Refactored `app/meta-objects/[type]/page.js` into an async Server Component that awaits `params` (`const { type } = await params;`) and passes it as a prop to `MetaobjectEntriesClient`.
  - Updated `new/page.js` to unwrap `params` using `use(params)` before accessing properties.
  - Updated `[entryId]/page.js` to accept `type` and `entryId` as direct props or unwrap `params`.
- **Reason**: Restores smooth navigation to `/meta-objects/[type]` and `/meta-objects/[type]/new` under Next.js 16.3.1 without dynamic API warnings or crashes.

---

## 8. Metafield Definition Deletion

### [`app/actions/deleteMetafield.js`](app/actions/deleteMetafield.js) & [`lib/bigcommerce-metafields-sync.js`](lib/bigcommerce-metafields-sync.js)
- **Action**: Created & Enhanced
- **What Was Changed**:
  - Implemented `deleteMetafield(id, category, context)` server action with user authentication and store scoping.
  - Automatically queries all product bundles in MySQL containing the deleted `key` / `namespace.key` and removes them.
  - Calls `removeMetafieldFromBigCommerceAndStorefront` to execute `DELETE /catalog/products/{id}/metafields/{mf.id}` on BigCommerce's native catalog API.
  - Updates the master bundle metafield (`metafields_app:bundle`) without the deleted field.
  - Executes `DELETE FROM metafield_definitions WHERE id = ? AND storeHash = ? AND category = ?`.
- **Reason**:
  - Ensures 100% data integrity across all layers: removes the definition, cleans up MySQL product bundles, and immediately removes the native BigCommerce metafield so that Stencil storefront themes (`{{#each product.metafields}}`) stop rendering the deleted field.

### [`app/meta-categories/[category]/metafields/page.js`](app/meta-categories/[category]/metafields/page.js)
- **Action**: Modified
- **What Was Changed**:
  - Added a Delete button (`<Trash2 />`) with confirmation dialog (`window.confirm`) and loading spinner next to each definition row in the table.
- **Reason**:
  - Allows merchants to delete metafield definitions directly from the category metafields table.

---

## 9. Variant Reference Picker Implementation

### [`app/actions/fetchProductVariantsForPicker.js`](app/actions/fetchProductVariantsForPicker.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Implemented `fetchProductVariantsForPicker(context, search = "")` server action.
  - Authenticates and queries BigCommerce API endpoint `/catalog/products` with `include=variants,images`.
  - Supports keyword search across product name and variant SKU.
  - Formats variants into a flat list including `variantId`, `productId`, `productName`, `variantTitle` (e.g. `T-Shirt — Large / Red`), `options`, `sku`, `price`, and variant or product thumbnail image URL.
- **Reason**:
  - BigCommerce products can contain multiple option variants. This action gives the frontend an easy-to-consume, searchable list of all catalog variants to select from.

### [`components/pickers/VariantPickerModal.js`](components/pickers/VariantPickerModal.js)
- **Action**: Created (New File)
- **What Was Changed**:
  - Implemented an interactive variant picker modal with live debounced search (300ms) by product title, SKU, or option values.
  - Displays variant thumbnail, parent product name, option badges (e.g. `Large / Red`), variant ID, SKU, and price.
  - Supports both single selection (for standard metafields) and multi-selection (for `isList` variant reference metafields).
- **Reason**:
  - Allows merchants to visually pick and assign specific product variants to variant reference metafields (e.g. `gift_products`) instead of manually finding and typing raw variant IDs.

### [`components/meta-categories/ProductMetaEdit.js`](components/meta-categories/ProductMetaEdit.js)
- **Action**: Modified
- **What Was Changed**:
  - Added import and conditional rendering of `VariantPickerModal`.
  - Added `case "variant_reference":` to `renderSingleInput` with a "Select Variant" trigger button and `<Layers />` icon.
  - Added `variant_reference` support to `renderMetafieldInput` for list mode with variant badge tags, remove buttons, and a "Select Variants" trigger button.
- **Reason**:
  - Seamlessly integrates variant reference selection into the product metafield editor, enabling merchants to configure gift products, bundled variants, or related add-ons with full storefront sync.

### [`app/api/storefront/metafields/route.js`](app/api/storefront/metafields/route.js)
- **Action**: Modified
- **What Was Changed**:
  - Added support for `itemId`, `pageId`, and `id` in addition to `productId`.
  - Added support for any `category` parameter (e.g. `category=pages`, `category=products`).
- **Reason**:
  - Because BigCommerce lacks a native `{{page.metafields}}` Handlebars object, this endpoint enables BigCommerce Stencil page templates and storefront scripts to query page metafields dynamically via `/api/storefront/metafields?category=pages&pageId={id}`.

---

## 10. Strict Shopify Namespaced Key (`namespace.key`) Convention

### [`app/actions/saveProductMetafieldsBundle.js`](app/actions/saveProductMetafieldsBundle.js)
- **Action**: Modified
- **What Was Changed**:
  - Updated bundle construction to store only the strict Shopify namespaced identifier: `bundleJson[`${namespace}.${key}`] = value`.
  - Removed duplicate bare `key` entry.
- **Reason**:
  - Eliminates duplicate entries and adheres strictly to Shopify's `namespace.key` convention across all saved bundles.

### [`app/actions/fetchProductMetafields.js`](app/actions/fetchProductMetafields.js) & [`lib/bigcommerce-metafields-sync.js`](lib/bigcommerce-metafields-sync.js)
- **Action**: Modified
- **What Was Changed**:
  - Prioritized `bundle[${namespace}.${key}]` lookup when reading bundles and pushing native BigCommerce metafields.
- **Reason**:
  - Ensures seamless reads and syncs matching the strict namespaced format.

### [`app/api/metafield-value/[category]/[id]/route.js`](app/api/metafield-value/[category]/[id]/route.js) & [`app/api/storefront/metafields/route.js`](app/api/storefront/metafields/route.js)
- **Action**: Modified
- **What Was Changed**:
  - Enforced deduplication in API responses so that all outputs strictly use `namespace.key` (e.g. `"custom.chatbot_message"`).
  - Cleaned legacy rows in MySQL `metafield_values` (pages 2, 3, 21) removing duplicate bare keys.
- **Reason**:
  - Ensures clean, non-duplicated JSON payloads for all API consumers and Stencil themes.

---

## 11. Decoupled Stencil Sync & Added API Endpoint & Response Modal

### [`app/actions/saveProductMetafieldsBundle.js`](app/actions/saveProductMetafieldsBundle.js)
- **Action**: Modified
- **What Was Changed**:
  - Removed `syncProductMetafieldsToBigCommerce` import and execution block.
- **Reason**:
  - Metafields are now stored exclusively in the local MySQL database (`metafield_values`) without pushing to BigCommerce catalog.

### [`app/actions/deleteMetafield.js`](app/actions/deleteMetafield.js)
- **Action**: Modified
- **What Was Changed**:
  - Removed `removeMetafieldFromBigCommerceAndStorefront` import and execution block.
- **Reason**:
  - Deletion operates purely within the MySQL database (`metafield_definitions` and `metafield_values`) without external BigCommerce catalog API calls.

### [`components/meta-categories/ProductMetaEdit.js`](components/meta-categories/ProductMetaEdit.js)
- **Action**: Modified
- **What Was Changed**:
  - Cleaned UI text from "Saving & Syncing..." to "Saving...".
  - Cleaned success notification from "saved and synced to BigCommerce" to "All metafields saved successfully."
- **Reason**:
  - Accurately reflects database-only persistence.

### [`app/meta-categories/[category]/metafields/page.js`](app/meta-categories/[category]/metafields/page.js)
- **Action**: Modified
- **What Was Changed**:
  - Removed BigCommerce Stencil Handlebars theme code snippet.
  - Replaced it with an interactive **Metafield API Endpoint & Response Modal** displaying:
    - Target REST API endpoint URL (`GET /api/metafield-value/[category]/[id]`) with copy button.
    - Client-side JavaScript `fetch()` example with copy button.
    - Expected JSON Response Data tailored to the selected metafield definition and type with copy button.
- **Reason**:
  - Enables developers to immediately copy and consume database metafields via REST API for headless setups, custom storefront widgets, and external apps.






