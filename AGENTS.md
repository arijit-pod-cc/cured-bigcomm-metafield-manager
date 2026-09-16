# Repository Guidelines

## Project Purpose

Build a custom BigCommerce app, using Next.js Pages Router, MySQL, and BigDesign, that gives merchants Shopify-like metafields and metaobjects. The app must expose two main tabs: `Metafields` and `Metaobjects`. Metafields define custom fields for BigCommerce resource types such as products, orders, customers, variants, categories, brands, and store-level data. Once a metafield definition is created for a resource type, every matching resource detail page can show that field and store a different value for each resource instance.

## Project Structure & Module Organization

Routes and API handlers live in `pages/`, including `pages/api/`, `pages/products/`, and `pages/orders/`. Shared UI components live in `components/`, React context in `context/`, server/client helpers in `lib/`, shared models in `types/`, and MySQL/Firebase adapters in `lib/dbs/`. Database setup currently starts in `scripts/db.js`. Tests mirror app routes under `test/pages/`.

## Architecture Requirements

- Use MySQL as the primary database through `lib/dbs/mysql.ts`; keep all custom data scoped by `storeHash`.
- Use BigDesign components for merchant UI, especially `Tabs`, `Table` or `StatefulTable`, `Panel`, `Form`, `Input`, `Select`, `Textarea`, `Checkbox`, `Button`, `Modal`, and `Alert`.
- Keep schema definitions separate from values. Definitions describe fields; values attach data to a BigCommerce resource or metaobject entry.
- Support scalar types such as `single_line_text`, `multi_line_text`, `rich_text`, `number_integer`, `number_decimal`, `boolean`, `date`, `date_time`, `url`, `json`, `file`, and `color`.
- Support reference types such as `product_reference`, `variant_reference`, `category_reference`, `customer_reference`, `order_reference`, and `metaobject_reference`.
- Support list mode for every eligible type with an `isList` flag. A metafield can reference one metaobject entry or a list of entries.
- The app must expose only two top-level tabs: `Metafields` and `Metaobjects`.
- The root route `/` should redirect immediately to `/metafields` and the product/home routes should not be surfaced in the main UI.
- `Metafields` must show resource buckets such as `Products`, `Orders`, `Customers`, `Variants`, `Categories`, and `Brands`, then allow merchants to drill into each bucket.
- `Metaobjects` must show reusable object definitions and their entries, and allow selecting metaobjects as a field type in metafield definitions.
- When a metafield definition is created for `Products`, it should be available across all product detail pages via `metafield_values`.
- Remove all mock/demo data from production pages and replace it with DB-backed API integration.

## Metafields / Metaobjects Flow

- `/metafields` → list resource buckets.
- `/metafields/[ownerType]` → show metafield definitions for the selected resource type.
- `/metafields/[ownerType]/add` → create a new metafield definition for that resource.
- `/metafields/edit/[id]` → edit a metafield definition.
- `/metaobjects` → list metaobject definitions.
- `/metaobjects/[type]` → show the selected metaobject definition and its entries.
- `/metaobjects/[type]/add` → create a new metaobject definition entry.
- `/metaobjects/edit/[id]` → edit a metaobject definition.

## Database Schema Requirements

- `metafield_definitions` stores definition metadata and owner mapping.
- `metafield_values` stores a definition value for a specific owner resource instance.
- `metaobject_definitions` stores reusable object types.
- `metaobject_field_definitions` stores fields inside a metaobject type.
- `metaobject_entries` stores individual metaobject entries.
- `metaobject_field_values` stores values for each metaobject entry field.

## Behavioral Requirements

- Definitions are created once per resource type and then apply to all matching resources.
- A product metafield definition should appear on all product detail pages after creation.
- Metaobject reference fields should allow selecting a metaobject type, and the saved value should link to an entry ID.
- List-mode fields should serialize values as JSON arrays in the database.

## Proposed MySQL Schema

Create `metafield_definitions` with `id`, `storeHash`, `ownerType`, `namespace`, `key`, `name`, `description`, `type`, `isList`, `referenceMetaobjectDefinitionId`, `validationsJson`, `defaultValueJson`, `isRequired`, `visibility`, `sortOrder`, `createdAt`, and `updatedAt`. Add a unique key on `storeHash, ownerType, namespace, key`.

Create `metafield_values` with `id`, `storeHash`, `definitionId`, `ownerType`, `ownerId`, `valueJson`, `createdAt`, and `updatedAt`. Add a unique key on `definitionId, ownerId`. Store list values as JSON arrays and reference values as BigCommerce IDs or metaobject entry IDs.

Create `metaobject_definitions` with `id`, `storeHash`, `type`, `name`, `description`, `displayFieldKey`, `status`, `createdAt`, and `updatedAt`. Add a unique key on `storeHash, type`.

Create `metaobject_field_definitions` with `id`, `storeHash`, `metaobjectDefinitionId`, `key`, `name`, `description`, `type`, `isList`, `referenceMetaobjectDefinitionId`, `validationsJson`, `isRequired`, `sortOrder`, `createdAt`, and `updatedAt`.

Create `metaobject_entries` with `id`, `storeHash`, `metaobjectDefinitionId`, `handle`, `displayName`, `status`, `createdAt`, and `updatedAt`. Add a unique key on `metaobjectDefinitionId, handle`.

Create `metaobject_field_values` with `id`, `storeHash`, `entryId`, `fieldDefinitionId`, `valueJson`, `createdAt`, and `updatedAt`. Add a unique key on `entryId, fieldDefinitionId`.

## API and UI Flow

Add Pages Router screens for definition lists, editors, and resource value editing. Recommended routes are `pages/metafields/index.tsx`, `pages/metafields/[ownerType].tsx`, `pages/metaobjects/index.tsx`, and `pages/metaobjects/[type].tsx`. API routes should mirror these concepts under `pages/api/metafields/` and `pages/api/metaobjects/`. Validate definition changes before saving values so removed or changed fields cannot orphan data silently.

## Build, Test, and Development Commands

- `npm install`: install dependencies; use Node `>=18 <20` and npm `>=8 <10`.
- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production Next.js build.
- `npm start`: serve the production build using `PORT`.
- `npm test`: run Jest and update snapshots.
- `npm run lint`: run ESLint across `.ts`, `.tsx`, and `.js` files.
- `npm run db:setup`: run `scripts/db.js` for database setup.

## Coding Style & Naming Conventions

Use TypeScript for app code and `.tsx` for React components. Follow lowercase file names such as `components/header.tsx` and route parameters such as `pages/products/[pid].tsx`. ESLint enforces TypeScript, React, React Hooks, import ordering, no `console.log`, and blank lines before `return`.

## Testing Guidelines

Use Jest with Testing Library and `jest-environment-jsdom`. Place specs under `test/` using `*.spec.tsx`, matching the route or component under test. Snapshot files live in adjacent `__snapshots__/` folders. Add tests for schema validation, value serialization, and UI flows that create definitions or assign values.

## Commit & Pull Request Guidelines

Write commit subjects in present-tense imperative mood, keep the first line to 72 characters or less, and reference related PRs or issues. Existing history includes scoped fixes such as `fix(cve): update next.js to 14.2.35`; prefer scoped subjects for maintenance work. Pull requests should include a focused description, test coverage notes, linked issues, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit real credentials. Use `.env-sample` and `sample-firebase-keys.json` as templates, and keep local secrets in `.env`. Store access tokens only in the existing `stores` table pattern. Validate `storeHash` on every API request so one store cannot read or mutate another store's definitions or values.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
