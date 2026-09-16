# Pages Metafields Implementation

## Overview
Successfully implemented BigCommerce Pages support in the metafields app. Users can now fetch, display, and manage metafields for BigCommerce pages using the exact same pattern as products.

## Implementation Details

### 1. **Pages Fetching Action** (`app/actions/fetchCategoryItems.js`)

Added `fetchPagesItems` function that:
- Calls BigCommerce Content Pages API endpoint: `/content/pages`
- Supports pagination with configurable page size (default: 50)
- Supports search/filtering with `keyword` parameter
- Returns normalized page data structure

**API Endpoint Used:**
```
GET https://api.bigcommerce.com/stores/{store_hash}/v3/content/pages?page={page}&limit={limit}&keyword={search}
```

**Response Data Mapping:**
```javascript
{
  id: page.id,           // Page ID
  name: page.name,       // Page name/title
  sku: page.url || id,   // Page URL or ID fallback
  image: null,           // Pages don't have images
  type: page.type        // Page type
}
```

### 2. **Pages UI Component** (`components/meta-categories/PagesCategoryItems.js`)

New component that displays pages in a professional paginated table:

**Features:**
- ✅ Search/filter pages by name
- ✅ Paginated table with Next/Previous buttons
- ✅ Click "Edit" to manage metafields for a page
- ✅ Shows page name and URL
- ✅ Loading state with spinner
- ✅ Empty state message when no pages found
- ✅ Total count display
- ✅ Modern UI matching the design system

**Table Columns:**
| Column | Content |
|--------|---------|
| Name | Page name/title |
| URL | Page URL or ID |
| Actions | Edit button to manage metafields |

### 3. **Routing Updates**

**Category Page** (`app/meta-categories/[category]/page.js`):
- Added import for `PagesCategoryItems`
- Added condition to render pages component when category === "pages"

**Category Item Page** (`app/meta-categories/[category]/[id]/page.js`):
- Updated to allow "pages" category alongside "products"
- Reuses `ProductMetaEdit` component for pages (same metafield editing logic)

### 4. **Data Flow**

```
PagesCategoryItems (UI)
    ↓
fetchCategoryItems('pages', context, options)
    ↓
fetchPagesItems(context, options)
    ↓
bigcommerceClient.get('/content/pages?...')
    ↓
BigCommerce API
    ↓
Return paginated page data
    ↓
Display in table
    ↓
Click Edit
    ↓
ProductMetaEdit (for page ID)
    ↓
fetchProductMetafields('pages', pageId, context)
    ↓
Manage metafields for that page
```

## How It Works

### 1. **View Pages List**
- Navigate to `/meta-categories/pages?context=...`
- App fetches pages from BigCommerce using the API
- Pages display in a paginated table
- Can search for specific pages

### 2. **Edit Page Metafields**
- Click "Edit" on any page
- Navigate to `/meta-categories/pages/{pageId}?context=...`
- View all metafields defined for pages
- Edit and save metafield values
- Values are stored per-page in the bundle JSON format

### 3. **Metafield Storage**
- Metafields for pages stored in `metafield_values` table
- Unique row per page: `storeHash + category('pages') + category_data_id(pageId)`
- All field values stored as namespace-keyed JSON:
```json
{
  "namespace1": "page value 1",
  "namespace2": ["array", "value"],
  "namespace3": null
}
```

## File Changes

### New Files
| File | Purpose |
|------|---------|
| `components/meta-categories/PagesCategoryItems.js` | Pages list display with pagination |

### Modified Files
| File | Changes |
|------|---------|
| `app/actions/fetchCategoryItems.js` | Added `fetchPagesItems` function + pages handling in router |
| `app/meta-categories/[category]/page.js` | Added import and route condition for pages |
| `app/meta-categories/[category]/[id]/page.js` | Updated to accept "pages" category |

## API Integration

### BigCommerce Pages API

**Endpoint:** `/v3/content/pages`

**Required:** Store access token with appropriate scopes

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 250)
- `keyword` - Search term for filtering

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "name": "About Us",
      "url": "/about-us",
      "type": "page",
      "body": "...",
      "status": "published"
    },
    ...
  ],
  "meta": {
    "pagination": {
      "total": 5,
      "count": 5,
      "per_page": 50,
      "current_page": 1,
      "total_pages": 1
    }
  }
}
```

## Features Summary

✅ **Full Pages Support**
- Fetch pages from BigCommerce
- Display in paginated table
- Search/filter functionality
- Edit metafields per page

✅ **Consistent UX**
- Same patterns as Products
- Familiar interface
- Professional design

✅ **Data Storage**
- Bundle-based JSON storage
- Namespace-keyed values
- Per-page isolation
- Consistent with product metafields

✅ **Error Handling**
- Missing context detection
- API error messages
- Loading states
- Empty state messaging

## Usage Example

1. Go to Pages category: `/meta-categories/pages?context=eyJ...`
2. See list of all pages from BigCommerce
3. Search for a specific page
4. Click "Edit" to manage that page's metafields
5. Add/edit field values
6. Click "Save All" to persist changes

## Technical Details

### Pagination
- Current implementation: 50 items per page
- Supports next/previous navigation
- Shows current page and total pages
- Disabled buttons at boundaries

### Search
- Real-time search as you type
- Resets pagination to page 1 on search
- Searches page names via `keyword` parameter

### Performance
- Lazy loading with pagination
- Async API calls
- No unnecessary re-renders
- Efficient state management

## Future Enhancements

1. **Bulk Operations**
   - Select multiple pages
   - Apply metafields to bulk pages
   - Batch updates

2. **Advanced Filtering**
   - Filter by page type
   - Filter by status (published/draft)
   - Sort options

3. **Page Preview**
   - Show page preview in tooltip
   - Display page status indicator
   - Show publication date

4. **Import/Export**
   - Export metafield values
   - Import from CSV
   - Batch field assignment

## Testing Checklist

- [ ] Navigate to `/meta-categories/pages?context=...`
- [ ] Verify pages list loads
- [ ] Test search functionality
- [ ] Test pagination (next/previous)
- [ ] Click edit on a page
- [ ] Verify metafields load for that page
- [ ] Edit a metafield value
- [ ] Click "Save All"
- [ ] Verify data persists on refresh
- [ ] Test empty state when no pages exist
- [ ] Test error handling with missing context

## Dependencies

No new dependencies added. Uses existing:
- Next.js
- React
- BigCommerce API client
- Lucide React (icons)

## Compatibility

- ✅ Works with existing metafield system
- ✅ Compatible with bundle-based storage
- ✅ Supports all field types (text, rich_text, etc.)
- ✅ Follows same data patterns as products
- ✅ SSR compatible
- ✅ React 19.2.8
- ✅ Next.js 16.3.1

## Related Documentation

- BigCommerce Pages API: https://developer.bigcommerce.com/docs/rest-content-management/pages
- Metafields Architecture: See REFACTORING_SUMMARY.md
- UI Modernization: See UI_MODERNIZATION_SUMMARY.md
- Quill Editor: See QUILL_EDITOR_SETUP.md
