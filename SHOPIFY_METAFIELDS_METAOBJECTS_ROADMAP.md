# BigCommerce Metafields & Metaobjects App — Shopify Parity Gap Analysis & Implementation Roadmap

> **Goal**: Build an enterprise-grade BigCommerce App that delivers the **exact same Metafields and Metaobjects functionality that Shopify provides**, tailored seamlessly for BigCommerce merchants and Stencil/Headless storefront themes.

---

## 1. Executive Summary

Shopify's custom data architecture is built on two complementary pillars:
1. **Metafields**: Custom key-value attributes attached directly to specific store resources (Products, Variants, Collections/Categories, Customers, Orders, Pages, Store-level Global data).
2. **Metaobjects**: Custom multi-field structured data models (e.g., *Brand Ambassador*, *Warranty Policy*, *Size Guide*, *Recipe*, *Designer Profile*) that can either exist independently with their own web pages or be referenced by Metafields.

This project already has the foundational scaffolding: BigCommerce OAuth authentication, MySQL persistence, Next.js server actions, Quill rich text editing, and basic product/page metafield value editing. 

However, to achieve **100% true Shopify parity**, critical architectural gaps must be addressed:
- The **Metaobjects engine** is currently only present as empty database tables with zero UI or business logic.
- Metafield definitions lack a distinct **`key`** (Shopify requires `namespace.key`), validation rules, choices, and default values.
- **Reference types** (Products, Variants, Categories, Metaobject entries) currently render as raw text inputs instead of interactive resource pickers.
- **File upload** does not persist files to WebDAV/CDN.
- **Storefront Theme access**: Saved metafields currently only reside in the app's local MySQL database without automated sync into BigCommerce native metafields or a public storefront API for Stencil / Headless themes.

---

## 2. Current Implementation Status ("What is Already Done")

### ✅ Authentication & Store Multi-tenancy
- **OAuth Installation Flow**: Full BigCommerce handshake implemented in `app/api/auth/route.js`.
- **App Load Verification**: JWT verification in `app/api/load/route.js` validating store hash and user identity.
- **App Uninstall**: Cleanup route in `app/api/uninstall/route.js`.
- **Session & Multi-Store Data**: MySQL tables `stores`, `users`, `storeUsers` handle store tokens and multi-user access permissions.

### ✅ Database Infrastructure
The following tables already exist in MySQL (`lib/dbs/mysql.js`):
- `metafield_definitions`
- `metafield_values`
- `metaobject_definitions`
- `metaobject_entries`
- `metaobject_field_definitions`
- `metaobject_field_values`

### ✅ Metafield Definitions Management (Partial)
- **Definitions Screen**: `app/meta-categories/[category]/metafields/page.js` lists definitions for a category.
- **Add/Edit Modal**: `components/meta-categories/AddMetafieldModal.js` supports:
  - Name and auto-generated namespace.
  - Description.
  - Type selection (categorized dropdown).
  - `isList` toggle (list of values).
  - `isRequired` toggle.
- **Server Actions**: `createMetafield.js`, `fetchMetafields.js`, `updateMetafield.js`, `getMetafield.js`.

### ✅ Resource Browsing & Value Editing (Partial)
- **Products**: Lists products with images, SKU, and pagination (`components/meta-categories/ProductCategoryItems.js`).
- **Pages**: Lists BigCommerce Content Pages (`components/meta-categories/PagesCategoryItems.js`).
- **Value Editor (`ProductMetaEdit.js`)**:
  - Displays all configured definitions for the resource.
  - Supports List Repeater (Add / Remove values for `isList` fields).
  - Single "Save All" bundled action (`saveProductMetafieldsBundle.js`).
  - Inputs implemented: `single_line_text`, `multi_line_text`, `rich_text` (via Quill editor), `number_integer`, `number_decimal`, `date`, `date_time`, `boolean`, `url`, `color`, `json`.

---

## 3. Detailed Gap Analysis (Current vs. Shopify Parity)

| Feature Area | Shopify Standard | Current Project State | Priority |
| :--- | :--- | :--- | :--- |
| **Metafields Identifier** | `namespace.key` (e.g. `custom.material`, `specs.wattage`) | Only has `namespace` (generated from Name); no distinct `key` field | 🔴 Critical |
| **Metaobjects Engine** | Full CRUD for definitions, field schemas, entries, and handles | 0% implemented (MySQL tables exist, but `app/meta-objects/page.js` is an empty stub) | 🔴 Critical |
| **Storefront Theme Access** | Available in Liquid/Storefront API (`product.metafields.custom.key`) | No storefront API and no sync to BigCommerce native metafields API | 🔴 Critical |
| **Resource Coverage** | Products, Variants, Collections, Customers, Orders, Pages, Shop | Only Products & Pages work. Categories, Variants, Customers, Orders, Brands are disabled | 🔴 High |
| **Reference Fields** | Interactive search & select modal for Products, Variants, Categories, Metaobjects | Just a plain text input asking for an ID string; disabled in definition modal | 🔴 High |
| **File / Media Type** | Uploads images/documents to CDN and returns permanent URL | HTML `<input type="file">` serializes to empty object `{}`; WebDAV not connected | 🔴 High |
| **Field Validations** | Min/max length, regex, choices (dropdown list), min/max numbers | Only `isRequired` exists; no choices or validation rules | 🟡 Medium |
| **UI Structure & Tabs** | 2 primary root sections: **Metafields** & **Metaobjects** | 3 tabs: Dashboard, Meta Categories, Meta Objects (with dummy counts) | 🟡 Medium |
| **Import / Export** | Bulk CSV / JSON export and import | Not implemented | 🟢 Low |

---

## 4. What is Actually Needed (Shopify-Parity Blueprint)

---

### Module 1: Database Schema Alignment

#### 1.1 `metafield_definitions`
Shopify identifies metafields by `ownerType` + `namespace` + `key`. 
Update the table to include:
```sql
ALTER TABLE metafield_definitions
  ADD COLUMN ownerType VARCHAR(50) NOT NULL AFTER storeHash,
  ADD COLUMN `key` VARCHAR(100) NOT NULL AFTER namespace,
  ADD COLUMN validationsJson LONGTEXT NULL AFTER referenceMetaobjectDefinitionId,
  ADD COLUMN defaultValueJson LONGTEXT NULL AFTER validationsJson,
  ADD COLUMN visibility VARCHAR(50) DEFAULT 'storefront' AFTER isRequired,
  ADD COLUMN sortOrder INT UNSIGNED DEFAULT 0 AFTER visibility,
  ADD UNIQUE KEY unique_owner_ns_key (storeHash, ownerType, namespace, `key`);
```

#### 1.2 `metafield_values`
Ensure compatibility between single-row bundling and individual definition querying:
```sql
-- Supports fast lookup of bundled values per resource instance:
CREATE TABLE IF NOT EXISTS metafield_resource_bundles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  storeHash VARCHAR(64) NOT NULL,
  ownerType VARCHAR(50) NOT NULL,
  ownerId VARCHAR(128) NOT NULL,
  valueJson LONGTEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_owner_resource (storeHash, ownerType, ownerId)
);
```

---

### Module 2: The Metaobjects Engine (Full Shopify Equivalent)

Metaobjects require 4 distinct sub-systems:

```
┌────────────────────────────────────────────────────────┐
│                   METAOBJECTS ENGINE                   │
├──────────────────────────┬─────────────────────────────┤
│ 1. Definition Manager    │ 2. Entry Manager            │
│    - Type (handle)       │    - Handle & Display Title │
│    - Display field key   │    - Field values editor    │
│    - Status (Active/Arch)│    - Published / Draft      │
├──────────────────────────┼─────────────────────────────┤
│ 3. Field Definitions     │ 4. Metaobject References    │
│    - Text, RichText,     │    - Selectable from Product│
│      Images, Numbers     │      Metafields & Entries   │
│    - Lists of fields     │    - Entry Picker Modal     │
└──────────────────────────┴─────────────────────────────┘
```

#### What Needs to be Built:
1. **Metaobject Definitions List (`/meta-objects`)**:
   - Table of all defined metaobjects (e.g. `Author`, `Warranty Policy`, `FAQ`, `Lookbook Slide`).
   - "Create Metaobject Definition" button.
2. **Metaobject Definition Builder (`/meta-objects/definitions/new` or modal)**:
   - Name (e.g., "Designer Profile").
   - Type / Handle (e.g., `designer_profile`).
   - Description.
   - Field List Manager: Add, reorder, and configure fields (e.g., `name`, `bio`, `avatar`, `website`).
   - Choose which field acts as the `displayFieldKey` (the label shown in entries table and select dropdowns).
3. **Metaobject Entries List (`/meta-objects/[type]`)**:
   - Lists all entries for a specific metaobject definition (e.g. Gucci, Prada, Nike under `designer_profile`).
   - Shows handle, display name, status, and last updated.
4. **Metaobject Entry Editor (`/meta-objects/[type]/new` & `/meta-objects/[type]/[id]`)**:
   - Dynamic form rendering each field defined in the metaobject schema.
   - Saves entry field values to `metaobject_entries` and `metaobject_field_values`.

---

### Module 3: Reference Types & Interactive Pickers

In Shopify, when a metafield is a reference type, the merchant does not type an ID—they click **"Select"** and search in a modal dialog.

We need interactive picker modals for:
1. **Product Picker (`product_reference`)**:
   - Search products by title/SKU with instant debounced search.
   - Shows thumbnail, product title, and SKU.
   - Supports single select or multi-select (`isList: true`).
2. **Variant Picker (`variant_reference`)**:
   - Drill-down into a product's variants to pick a specific SKU/option.
3. **Category Picker (`category_reference`)**:
   - Tree/list of BigCommerce categories.
4. **Customer Picker (`customer_reference`)**:
   - Search by customer name, email, or company.
5. **Order Picker (`order_reference`)**:
   - Search by order ID or customer name.
6. **Metaobject Entry Picker (`metaobject_reference`)**:
   - Dropdown or search modal listing entries of the target metaobject definition.
   - Displays the entry's `displayName`.

---

### Module 4: File Upload & WebDAV / CDN Integration

Currently, selecting a file in the UI does not upload anywhere. 
To achieve Shopify-style file metafields:
1. Implement a server action / API route `app/api/upload/route.js`.
2. Connect to **BigCommerce WebDAV** (credentials already present in `.env.local`: `BIGCOMMERCE_WEBDAV_URL`, `USERNAME`, `PASSWORD`) or cloud storage (S3 / Cloudinary / BigCommerce CDN).
3. When merchant uploads an image/document:
   - Upload file to `/content/metafields/{storeHash}/...`.
   - Store the public CDN URL in the metafield value.
   - In the UI, render an image preview with a "Remove" or "Replace" button.

---

### Module 5: Field Validations & Choices

Shopify allows setting constraints when defining a field. Add support in `AddMetafieldModal`:
1. **Single-line text**:
   - Preset choices (enum dropdown/radio options, e.g. `["Small", "Medium", "Large"]`).
   - Regular expression pattern.
   - Min / Max character length.
2. **Numbers (Integer & Decimal)**:
   - Minimum value.
   - Maximum value.
3. **Files**:
   - Allowed file extensions (e.g., `image/*`, `.pdf`, `.svg`).

---

### Module 6: BigCommerce Storefront & Theme Delivery

**The #1 missing link**: Merchants create metafields so they can display them on their storefront. Right now, data is isolated in MySQL.

We must implement a dual-delivery strategy:

#### Strategy A: Direct BigCommerce Metafield Sync (For Stencil Themes)
When saving metafields for a Product / Category / Order:
- Call BigCommerce API `POST /v3/catalog/products/{id}/metafields` with:
  ```json
  {
    "permission_set": "read_and_sf_access",
    "namespace": "custom",
    "key": "material",
    "value": "100% Organic Cotton"
  }
  ```
- Also save a bundled JSON metafield:
  ```json
  {
    "permission_set": "read_and_sf_access",
    "namespace": "metafields_app",
    "key": "bundle",
    "value": "{\"material\":\"100% Organic Cotton\",\"warranty\":\"2 Years\"}"
  }
  ```
- **Why this is critical**: Stencil themes can then immediately render fields in Handlebars:
  ```handlebars
  {{#each product.metafields}}
    {{#if key '===' 'material'}}
      <div class="product-material">{{value}}</div>
    {{/if}}
  {{/each}}
  ```

#### Strategy B: High-Performance Storefront API (For Headless & Dynamic Widgets)
- Create `GET /api/storefront/metafields?productId={id}&storeHash={hash}`.
- Create `GET /api/storefront/metaobjects?type={type}&handle={handle}`.
- Add CORS support and caching headers (`Cache-Control: public, s-maxage=60, stale-while-revalidate=300`).
- Allows client-side JavaScript or Next.js / Gatsby / Hydrogen storefronts to query metafields and metaobjects dynamically.

#### Strategy C: Theme Code Snippet Generator
In the app UI, provide a **"Theme Code"** copy button next to each metafield and metaobject:
- Stencil Handlebars snippet: `{{#each product.metafields}}...{{/each}}`
- GraphQL Storefront API snippet.
- JavaScript `fetch()` snippet.

---

### Module 7: All Resource Types Coverage

Currently, only Products and Content Pages have list views. Expand to all standard BigCommerce resources:
1. **Products** (`/meta-categories/products`) — *Active*
2. **Product Variants** (`/meta-categories/variants`) — Needs product drill-down to edit variant-level metafields.
3. **Categories** (`/meta-categories/categories`) — Fetch from `/v3/catalog/categories`.
4. **Brands** (`/meta-categories/brands`) — Fetch from `/v3/catalog/brands`.
5. **Customers** (`/meta-categories/customers`) — Fetch from `/v3/customers`.
6. **Orders** (`/meta-categories/orders`) — Fetch from `/v2/orders`.
7. **Pages** (`/meta-categories/pages`) — *Active*
8. **Store Settings / Global** (`/meta-categories/store`) — Global store metafields not attached to any single item (e.g. Header promo banner, Global size chart).

---

## 5. Step-by-Step Implementation Checklist

Use this checklist to track your development progress:

### 🔲 Phase 1: Core Metafield Model & Schema Upgrade
- [ ] Add `key`, `ownerType`, `validationsJson`, `defaultValueJson`, `visibility`, and `sortOrder` to `metafield_definitions`.
- [ ] Update `createMetafield.js` and `updateMetafield.js` to accept and validate `key` alongside `namespace`.
- [ ] Update `AddMetafieldModal.js` with inputs for:
  - Definition Name (e.g., "Care Instructions").
  - Namespace & Key (e.g., `custom` and `care_instructions`).
  - Validation rules (Choices, Min/Max, Regex).
  - Default value.

### 🔲 Phase 2: Metaobjects Engine (Definition & Entries)
- [ ] Build Server Actions for Metaobject Definitions:
  - `createMetaobjectDefinition.js`
  - `fetchMetaobjectDefinitions.js`
  - `updateMetaobjectDefinition.js`
  - `deleteMetaobjectDefinition.js`
- [ ] Build Server Actions for Metaobject Entries:
  - `createMetaobjectEntry.js`
  - `fetchMetaobjectEntries.js`
  - `updateMetaobjectEntry.js`
  - `deleteMetaobjectEntry.js`
- [ ] Build UI pages for Metaobjects:
  - `app/meta-objects/page.js`: List of metaobject types with entry counts.
  - `app/meta-objects/new/page.js`: Metaobject schema definition builder.
  - `app/meta-objects/[type]/page.js`: Entries table for the selected metaobject.
  - `app/meta-objects/[type]/[entryId]/page.js`: Entry editor for populating field values.

### 🔲 Phase 3: Resource Pickers & File Upload
- [ ] Create `ResourcePickerModal.js` component for:
  - Products & Variants (with search, thumbnail, pagination).
  - Categories (searchable category list).
  - Metaobject Entries (filtered by referenced metaobject definition).
- [ ] Implement `WebDAV` file upload server action:
  - Upload file buffer to BigCommerce WebDAV.
  - Save CDN URL in metafield value.
  - Image preview and remove UI in `ProductMetaEdit.js`.

### 🔲 Phase 4: BigCommerce Storefront Sync & APIs
- [ ] In `saveProductMetafieldsBundle.js`, add background sync to BigCommerce native `/v3/catalog/products/{id}/metafields`.
- [ ] Build public Storefront API endpoints:
  - `app/api/storefront/metafields/route.js` (CORS enabled).
  - `app/api/storefront/metaobjects/route.js` (CORS enabled).
- [ ] Add "Theme Code Snippet" modal in definitions view showing Handlebars / GraphQL code to copy-paste.

### 🔲 Phase 5: Resource Coverage & Navigation Polish
- [ ] Enable Categories, Brands, Customers, Orders, and Global Store metafields.
- [ ] Connect real counts in `DashboardStats.js` and `MetaCategoryList.js` from MySQL instead of hardcoded numbers.
- [ ] Ensure seamless `context` token preservation across all routes and sub-pages.
