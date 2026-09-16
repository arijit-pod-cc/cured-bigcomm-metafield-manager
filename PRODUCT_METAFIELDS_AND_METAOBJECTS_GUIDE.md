# Product Metafields & Metaobjects — Master Implementation & Architecture Guide

> **Target**: 100% Shopify-identical Metafields & Metaobjects for BigCommerce Products, built directly on this project's existing Next.js App Router, Server Actions, MySQL, and Tailwind CSS architecture — designed so other categories (Variants, Categories, Customers, Orders) plug in effortlessly in the future.

---

## 1. Ground Truth Reality Check: Is It Working Perfectly Right Now?

**Direct Answer: No.** 

While the app has a great visual layout and can save basic text/number fields to MySQL, testing against the actual database and code reveals **5 critical gaps** preventing it from being production-ready for products:

### Evidence from your current database (`storeHash: 2dcwnfok6l`):

```
Current rows in metafield_values:
- Product 117: valueJson = '{"product_color":"#8e1f1a","product_qty":"110","product_image":[], ...}'
- Product 140: valueJson = '{"product_color":"","product_qty":"0","product_image":[], ...}'
```

### Why it is NOT working perfectly yet:

1. **Zero Storefront Presence (The Biggest Problem)**:
   - When a merchant fills out `product_color: #8e1f1a` in this app, **BigCommerce storefront themes (Cornerstone/Stencil) CANNOT see it**.
   - The value is stored strictly inside your local MySQL database. It is **never synced** to BigCommerce's native `/v3/catalog/products/{id}/metafields` API. A theme developer opening `templates/components/products/product-view.html` cannot access `{{product.metafields}}`.
2. **File / Image Upload is Completely Broken**:
   - As seen in Product 117's database record above: `"product_image":[]`.
   - In `ProductMetaEdit.js`, `<input type="file">` passes a browser `File` object into state. When `JSON.stringify()` executes during save, the file turns into an empty object `{}`. The file is never uploaded to BigCommerce WebDAV or CDN.
3. **Metaobjects are 0% Implemented**:
   - The database tables exist in MySQL, but `app/meta-objects/page.js` is an empty placeholder with `<h1>Meta Manager</h1>`.
   - There is no UI to define metaobjects (e.g., *Designer*, *Size Chart*, *Warranty Policy*), no UI to create entries, and no way for a product to reference a metaobject entry.
4. **Reference Fields Have No Pickers**:
   - If a product metafield is set to `product_reference` or `metaobject_reference`, the UI currently renders a raw text box asking the merchant to manually type an ID number. In Shopify, merchants search and click a product/metaobject in a visual modal.
5. **No `key` Separation or Validation Rules**:
   - Shopify identifies metafields by `namespace.key` (e.g., `custom.material`). Currently, the app only generates a `namespace` from the Name (e.g. `product_color`), leaving no standard namespace grouping.
   - Field validations (choices/presets, character limits, min/max numbers) are not supported.

---

## 2. Complete Shopify Custom Data Type System & Mechanics

Shopify's custom data architecture consists of two interconnected pillars: **Metafields** and **Metaobjects**.

### 2.1 The Complete Type Taxonomy

In Shopify, every Metafield and every Field inside a Metaobject uses one of the following typed definitions:

| Type Category | Type Name | Shopify Identifier | Description | Stored Value Format |
| :--- | :--- | :--- | :--- | :--- |
| **Text** | Single line text | `single_line_text_field` | Short strings, titles, codes | `"Organic Cotton"` |
| **Text** | Multi-line text | `multi_line_text_field` | Unformatted paragraph text | `"Line 1\nLine 2"` |
| **Text** | Rich text | `rich_text_field` | Formatted HTML / ProseMirror | `"<p><strong>Bold</strong></p>"` |
| **Numeric** | Integer | `number_integer` | Whole numbers, counts | `42` |
| **Numeric** | Decimal | `number_decimal` | Precision numbers, percentages | `19.99` |
| **Measurement**| Dimension | `dimension` | Length, width, height with unit | `{"value": 15.5, "unit": "cm"}` |
| **Measurement**| Weight | `weight` | Mass/weight with unit | `{"value": 2.3, "unit": "kg"}` |
| **Measurement**| Volume | `volume` | Liquid capacity with unit | `{"value": 750, "unit": "ml"}` |
| **Rating** | Rating | `rating` | Star ratings with scale | `{"value": 4.5, "scale_min": 1, "scale_max": 5}` |
| **Date** | Date | `date` | ISO 8601 calendar date | `"2026-09-18"` |
| **Date** | Date & Time | `date_time` | ISO 8601 timestamp with time | `"2026-09-18T16:12:00Z"` |
| **Logical** | Boolean | `boolean` | True / False switch | `true` or `false` |
| **Web / Media**| URL | `url` | Web hyperlinks | `"https://example.com"` |
| **Web / Media**| Color | `color` | Hexadecimal color code | `"#8e1f1a"` |
| **Web / Media**| File Reference | `file_reference` | Image, PDF, video URL | `"https://cdn.../specs.pdf"` |
| **Structured** | JSON | `json` | Arbitrary JSON objects | `{"key": "value"}` |
| **Reference** | Product | `product_reference` | Link to BigCommerce Product ID | `"117"` |
| **Reference** | Variant | `variant_reference` | Link to Product Variant ID | `"452"` |
| **Reference** | Category | `category_reference`| Link to Category ID | `"18"` |
| **Reference** | Customer | `customer_reference`| Link to Customer ID | `"90"` |
| **Reference** | Order | `order_reference` | Link to Order ID | `"1004"` |
| **Reference** | **Metaobject**| `metaobject_reference`| Link to Metaobject Entry ID | `"entry_55"` |

---

### 2.2 Single Value vs. List of Values (`isList` / `list.<type>`)

In Shopify, almost **every single type** above can be configured as either:
1. **Single Value** (`isList: false`): The field holds one instance of that type.
2. **List of Values** (`isList: true`, or `list.<type>` in Shopify): The field holds an array of values of that type.

#### Practical Examples of Single vs. List:

```
┌───────────────────────────┬─────────────────────────────┬────────────────────────────────────────────────────────┐
│ Field Type                │ Single Value (isList: false)│ List of Values (isList: true)                          │
├───────────────────────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ single_line_text          │ "Made in USA"               │ ["Eco-Friendly", "Waterproof", "BPA Free"]             │
│ file_reference (Image)    │ "https://cdn/cover.png"     │ ["https://cdn/doc1.pdf", "https://cdn/doc2.pdf"]       │
│ color                     │ "#8e1f1a"                   │ ["#8e1f1a", "#ffffff", "#000000"]                      │
│ product_reference         │ "117" (1 Upsell Product)    │ ["117", "140", "205"] (Frequently Bought Together)     │
│ metaobject_reference      │ "entry_1" (1 Primary Maker) │ ["entry_1", "entry_2", "entry_3"] (Team / Ingredients) │
└───────────────────────────┴─────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### How Lists are Handled in Storage and UI:
- **In MySQL Storage**: Lists are serialized as JSON arrays: `["item1", "item2"]`.
- **In Merchant UI**: 
  - Single values render as a standard input (e.g., `<input>`, `<select>`, `<QuillEditor>`).
  - List values render as a **Repeater component**: shows existing values with an "Add value" button, drag-and-drop or reorder buttons, and a trash icon to remove items.
- **In BigCommerce Sync**: Synced as a stringified JSON array into BigCommerce native metafields so themes can loop through them with `{{#each}}`.

---

### 2.3 Can a Metaobject be Assigned to a Product Metafield? (YES!)

**YES! This is the most powerful feature of the Shopify custom data model.**

A Metaobject is a reusable structured object (like a mini-database table created by the merchant). A Product Metafield can point directly to a Metaobject entry (or a list of entries).

#### End-to-End Real-World Walkthrough:

```
Step 1: Define Metaobject (e.g., "Fabric Care")
  ├── Field 1: title (single_line_text)
  ├── Field 2: washing_instructions (rich_text)
  ├── Field 3: icon (file_reference)
  └── Field 4: iron_safe (boolean)
          │
Step 2: Create Reusable Entries
  ├── Entry A: "100% Organic Silk" (Handle: "silk-care")
  └── Entry B: "Heavy Duty Denim" (Handle: "denim-care")
          │
Step 3: Define Product Metafield
  ├── Name: "Fabric Care Guide"
  ├── Namespace: "custom", Key: "care_guide"
  ├── Type: "metaobject_reference"
  ├── Target Metaobject Definition: "Fabric Care"
  └── isList: false (or true if product has multiple fabric parts)
          │
Step 4: Assign to Product on /meta-categories/products/117
  └── Merchant clicks picker modal and chooses: "100% Organic Silk"
          │
Step 5: Storefront Rendering (BigCommerce Theme)
  └── Storefront theme displays:
      - Title: "100% Organic Silk"
      - Washing instructions: Rich text formatted steps
      - Care Icon: Image from CDN
```

#### Technical Data Linking:
1. When creating the Product Metafield Definition:
   - `type` = `"metaobject_reference"`
   - `referenceMetaobjectDefinitionId` = `metaobject_definitions.id` (e.g., `4`)
   - `isList` = `0` (or `1` for list)
2. When editing Product 117:
   - The UI displays a picker showing all entries from `metaobject_entries WHERE metaobjectDefinitionId = 4`.
   - The merchant selects Entry #12 ("100% Organic Silk").
   - The saved value in `metafield_values` stores the entry ID (`"12"` or `["12", "15"]`).
3. During Storefront Sync & Display:
   - The app hydrates the entry: fetches the entry fields and bundles the complete object so the storefront theme receives the resolved name, text, and images without needing secondary queries!

---

## 3. The BigCommerce App Architecture

We will implement this Shopify-identical system using your project's **exact established stack**:
- **Framework**: Next.js App Router (`app/`)
- **Backend Logic**: Server Actions in `app/actions/`
- **Database**: MySQL pool in `lib/dbs/mysql.js`
- **UI Framework**: Tailwind CSS with Lucide icons in `components/`
- **Context Passing**: BigCommerce JWT context preserved via URL (`?context=...`)
- **API Client**: `node-bigcommerce` in `lib/auth.js`

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MERCHANT ADMIN UI                                      │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│  1. Metafield Definitions              │  2. Metaobjects Manager                       │
│     - Define custom fields for Products│     - Define reusable schemas (e.g. Warranty) │
│     - Set Type, Namespace, Key, Valid's│     - Create entries (e.g. "2-Year Gold Care")│
├────────────────────────────────────────┴───────────────────────────────────────────────┤
│  3. Product Metafields Editor (on /meta-categories/products/[id])                      │
│     - Fills text, rich text, images (WebDAV), references & metaobjects                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                SERVER ACTIONS LAYER                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  4. Local Persistence (MySQL)          │  5. BigCommerce Native Sync Engine            │
│     - Instant atomic save to MySQL     │     - Pushes `permission_set: read_and_sf_`    │
│     - Stores full structured JSON      │       to BigCommerce /catalog/products/meta...│
│                                        │     - Makes data natively visible in Stencil  │
├────────────────────────────────────────┴───────────────────────────────────────────────┤
│                                 STOREFRONT ACCESS                                      │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│  Option A: Stencil Handlebars (Native) │  Option B: Storefront Headless / GraphQL API  │
│  {{#each product.metafields}}          │  GET /api/storefront/metafields?id=117        │
│    {{#if key '===' 'care_guide'}}      │  (Fast cached CORS endpoint for JS widgets)   │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 4. What Actually Needs to be Built (Step-by-Step Blueprint)

### Component 1: Database Schema Finalization
Your database already has the required tables. We make 3 targeted updates:

1. **Add `key` and `validationsJson` to `metafield_definitions`**:
   ```sql
   ALTER TABLE metafield_definitions
     ADD COLUMN `key` VARCHAR(100) NOT NULL AFTER namespace,
     ADD COLUMN validationsJson LONGTEXT NULL AFTER referenceMetaobjectDefinitionId,
     ADD COLUMN defaultValueJson LONGTEXT NULL AFTER validationsJson,
     ADD COLUMN sortOrder INT UNSIGNED DEFAULT 0 AFTER isRequired;
   ```
2. **Update `metafield_values`**:
   Ensure `definitionId` allows `NULL` or defaults to `0` so single-row product bundles save cleanly without SQL errors:
   ```sql
   ALTER TABLE metafield_values MODIFY definitionId INT(11) UNSIGNED NULL DEFAULT 0;
   ```

---

### Component 2: Product Metafield Definitions Upgrade
Currently, `AddMetafieldModal.js` automatically turns the name into a namespace. 

**Shopify-identical behavior**:
- **Name**: e.g., "Care Guide"
- **Namespace & Key**: 
  - Namespace defaults to `custom` (or merchant-configurable group like `specs`).
  - Key auto-slugifies the name: `care_guide`.
  - Full identifier: `custom.care_guide`.
- **Target Metaobject Selection**:
  - When `metaobject_reference` is chosen, show a dropdown to select the target Metaobject Definition.
- **List Toggle**:
  - Checkbox: *"Store as a list of values"* (`isList: true`).
- **Validation Rules**:
  - For Text: Character count limit, Regex, or **Preset Choices (single-choice dropdown)**.
  - For Numbers: Minimum & Maximum values.

---

### Component 3: BigCommerce Native Sync (Making Data Visible on Storefront)

When a merchant clicks **"Save All"** on `/meta-categories/products/117`:

1. **Step 1**: Save the full bundle into MySQL (`metafield_values`) for fast app dashboard rendering.
2. **Step 2**: Sync each field into BigCommerce native metafields:
   - Call BigCommerce API: `GET /catalog/products/{id}/metafields` to get existing native metafields.
   - For each defined field, if existing: `PUT /catalog/products/{id}/metafields/{metafield_id}`.
   - If new: `POST /catalog/products/{id}/metafields` with:
     ```json
     {
       "permission_set": "read_and_sf_access",
       "namespace": "custom",
       "key": "product_color",
       "value": "#8e1f1a",
       "description": "Product Color"
     }
     ```
   - Also write a master bundle metafield:
     ```json
     {
       "permission_set": "read_and_sf_access",
       "namespace": "metafields_app",
       "key": "bundle",
       "value": "{\"product_color\":\"#8e1f1a\",\"product_qty\":110}"
     }
     ```

#### How this renders on the Storefront:
In the BigCommerce theme (`templates/components/products/product-view.html`):
```handlebars
{{#each product.metafields}}
  {{#if key '===' 'product_color'}}
    <div class="custom-badge" style="background-color: {{value}};">
      Color: {{value}}
    </div>
  {{/if}}
{{/each}}
```
**No third-party scripts, zero latency, 100% native BigCommerce Stencil compatibility!**

---

### Component 4: WebDAV File & Image Uploader

In `.env.local`, you already have:
```env
BIGCOMMERCE_WEBDAV_USERNAME=arijit.jana@codeclouds.net
BIGCOMMERCE_WEBDAV_PASSWORD=...
BIGCOMMERCE_WEBDAV_URL=https://store-2dcwnfok6l.mybigcommerce.com/dav
BIGCOMMERCE_CDN_URL=https://store-2dcwnfok6l.mybigcommerce.com
```

#### The Implementation:
1. Create Server Action `app/actions/uploadMetafieldFile.js`:
   - Takes a `FormData` containing the file, `category` ("products"), and `categoryDataId` ("117").
   - Connects to BigCommerce WebDAV using Basic Auth.
   - Uploads file to `/content/metafields/products/117/{filename}`.
   - Returns the public CDN URL: `https://store-2dcwnfok6l.mybigcommerce.com/content/metafields/products/117/{filename}`.
2. In `ProductMetaEdit.js`:
   - File input calls `uploadMetafieldFile` on file selection.
   - Displays an image preview / file thumbnail with a "Remove" button.
   - Saves the clean CDN URL string in the product's metafield bundle.

---

### Component 5: The Complete Metaobjects Engine

Metaobjects allow creating reusable objects that products can link to.

#### Routes to Build in `app/meta-objects/`:
1. **`/meta-objects`** (`app/meta-objects/page.js`):
   - Displays cards or table of Metaobject Definitions with entry counts.
   - Button: "Create metaobject definition".
2. **`/meta-objects/definitions/new`** & **`edit/[id]`**:
   - Definition Name & Handle (e.g. `warranty_policy`).
   - Field definitions list: add fields (`single_line_text`, `rich_text`, `file`, etc.).
   - Choose which field is the `displayFieldKey` (e.g. `title`).
3. **`/meta-objects/[type]`**:
   - Table of all entries created for this metaobject type (Handle, Display Name, Status, Date).
   - Button: "Add entry".
4. **`/meta-objects/[type]/new`** & **`[type]/[entryId]`**:
   - Form dynamically generated based on the metaobject's field definitions.
   - Saves values to `metaobject_entries` and `metaobject_field_values`.

---

### Component 6: Interactive Resource & Metaobject Pickers

Replace raw ID text boxes with visual pickers:
- **Product Picker (`product_reference`)**:
  - Modal pops up with live search against BigCommerce products.
  - Shows product thumbnail, title, SKU, and price.
  - Clicking a product selects its ID and displays a clean card: `[Image] [Product Title] [SKU] (x Remove)`.
- **Metaobject Picker (`metaobject_reference`)**:
  - Modal/Dropdown fetching entries of the target metaobject.
  - Displays the entry's `displayName`.
  - Supports single-select (`isList: false`) or multi-select (`isList: true`).

---

## 5. How Other Categories Plug In Later (Future-Proof Architecture)

Notice how the entire architecture is parameterized by **`category`** and **`categoryDataId`**:

| Category | API Source for Items | Category Data ID | Sync Target in BigCommerce |
| :--- | :--- | :--- | :--- |
| **products** *(Now)* | `/catalog/products` | `product.id` | `/v3/catalog/products/{id}/metafields` |
| **variants** *(Future)*| `/catalog/products/{id}/variants` | `variant.id` | `/v3/catalog/products/{pid}/variants/{vid}/metafields` |
| **categories** *(Future)* | `/catalog/categories` | `category.id` | `/v3/catalog/categories/{id}/metafields` |
| **brands** *(Future)* | `/catalog/brands` | `brand.id` | `/v3/catalog/brands/{id}/metafields` |
| **customers** *(Future)* | `/customers` | `customer.id` | `/v3/customers/metafields` (with customer_id) |
| **orders** *(Future)* | `/orders` | `order.id` | `/v3/orders/{id}/metafields` |
| **pages** *(Now)* | `/content/pages` | `page.id` | MySQL bundle (BigCommerce pages lack native metafield API) |

Because we keep `saveCategoryMetafieldsBundle(category, id, ...)` and `fetchCategoryMetafields(category, id, ...)`, **expanding to another category later takes less than 30 minutes** because the storage, validation, and UI engines are 100% shared!

---

## 6. Execution Roadmap: 5-Phase Work Plan

### 📌 Phase 1: Database & Identifier Alignment (Day 1)
- [ ] Add `key`, `validationsJson`, `defaultValueJson`, and `sortOrder` columns to `metafield_definitions`.
- [ ] Make `metafield_values.definitionId` nullable with default `0`.
- [ ] Update `createMetafield.js` and `updateMetafield.js` to handle `key` and validations.
- [ ] Update `AddMetafieldModal.js` to configure `key` and preset choices / validation rules.

### 📌 Phase 2: WebDAV File Upload & Preview (Day 2)
- [ ] Create `lib/webdav.js` helper using existing `.env.local` WebDAV credentials.
- [ ] Create Server Action `app/actions/uploadMetafieldFile.js`.
- [ ] Update `ProductMetaEdit.js` to upload on selection, render thumbnail previews, and handle file removals.

### 📌 Phase 3: BigCommerce Native Metafields Sync (Day 3)
- [ ] Create `lib/bigcommerce-metafields-sync.js`.
- [ ] Hook the sync into `saveProductMetafieldsBundle.js` so every save instantly writes to `/v3/catalog/products/{id}/metafields` with `permission_set: "read_and_sf_access"`.
- [ ] Test and verify that Stencil theme Handlebars `{{#each product.metafields}}` immediately renders the values.

### 📌 Phase 4: Metaobjects Full Engine (Days 4 - 5)
- [ ] Create server actions for Metaobject Definitions CRUD (`createMetaobjectDefinition.js`, `fetchMetaobjectDefinitions.js`).
- [ ] Create server actions for Metaobject Entries CRUD (`createMetaobjectEntry.js`, `fetchMetaobjectEntries.js`).
- [ ] Build `/meta-objects` listing UI and Definition Builder.
- [ ] Build `/meta-objects/[type]` entries table and Entry Editor.

### 📌 Phase 5: Resource & Metaobject Pickers (Day 6)
- [ ] Build `ProductPickerModal.js` with search and thumbnail preview.
- [ ] Build `MetaobjectEntryPicker.js` for `metaobject_reference` fields (supporting single & list mode).
- [ ] Wire pickers into `ProductMetaEdit.js`.
- [ ] Verify complete end-to-end flow: Create Metaobject Definition -> Add Entry -> Reference in Product Metafield -> Edit Product -> Save -> View on Storefront.
