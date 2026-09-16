# Product Metafields Storage Refactoring - Implementation Summary

## Overview
Refactored the product metafields storage system to use a single JSON bundle per product instead of individual rows for each metafield value. This includes a corresponding UI update with a single "Save All" button.

## Changes Made

### 1. New Action: `saveProductMetafieldsBundle.js`
**Location:** `app/actions/saveProductMetafieldsBundle.js`

**Purpose:** Saves all metafield values for a product as a single JSON bundle.

**Key Features:**
- Takes all metafield values keyed by definitionId
- Converts to namespace-keyed JSON structure internally
- Stores/updates a single row in `metafield_values` per product
- Validates all fields before saving
- Returns bundle structure with namespace keys

**JSON Structure:**
```json
{
  "namespace1": "value1",
  "namespace2": ["item1", "item2"],
  "namespace3": null,
  "namespace4": { "ref": 123 }
}
```

**Database Uniqueness:**
- Old: `storeHash + definitionId + category + category_data_id` (N rows)
- New: `storeHash + category + category_data_id` (1 row per product)

### 2. Updated Action: `fetchProductMetafields.js`
**Location:** `app/actions/fetchProductMetafields.js`

**Changes:**
- Now fetches a single row containing all metafield values as a JSON bundle
- Parses namespace-keyed JSON from `valueJson` column
- Converts namespace keys back to definitionId keys for UI consumption
- Returns metafield values mapped by definitionId (maintains same format for UI)

**Backward Compatibility:**
- Returns same data structure to UI (keyed by definitionId)
- UI change is minimal and transparent

### 3. Refactored Component: `ProductMetaEdit.js`
**Location:** `components/meta-categories/ProductMetaEdit.js`

**UI Changes:**
- **Header Save Button:** Single "Save All" button in header (top-right)
- **Per-Field Buttons:** Removed individual save buttons from each metafield card
- **Change Detection:** Grayed out save button when no changes detected
- **Namespace Display:** Namespace shown as metadata tag on each field (for clarity)

**State Management:**
- Added `originalValues` state to track initial state
- Added `saving` state (boolean) for overall save progress
- Removed `savingId` state (no longer per-field)

**New Functions:**
- `hasChanges()`: Detects if any values differ from original
- `handleSaveAll()`: Saves all metafields as a bundle

**Removed Functions:**
- `handleSave(metafield)`: Replaced by `handleSaveAll()`

**Component Changes:**
- Removed `saving`, `onSave` props from `MetafieldCard`
- `MetafieldCard` is now simpler, just displays the field

## Route Context
- Route: `/meta-categories/products/[id]`
- Example: `/meta-categories/products/117?context=...`
- Component: `ProductMetaEdit` in `pages/meta-categories/[category]/[id]/page.js`

## Database Impact
The database structure remains unchanged, but usage changes:
- **Old Model:** Each metafield value = separate row
  - Example: Product 117 with 3 metafields = 3 rows

- **New Model:** All metafield values for product = single row
  - Example: Product 117 with 3 metafields = 1 row with bundled JSON

**Example Old vs New:**

Old Structure:
```
id   | storeHash | definitionId | category  | category_data_id | valueJson
1    | hash1     | 100          | products  | 117              | "value1"
2    | hash1     | 101          | products  | 117              | "value2"
3    | hash1     | 102          | products  | 117              | "value3"
```

New Structure:
```
id   | storeHash | category  | category_data_id | valueJson
1    | hash1     | products  | 117              | {"namespace1":"value1","namespace2":"value2","namespace3":"value3"}
```

## Testing Checklist

### UI Testing
- [ ] Navigate to `/meta-categories/products/[id]?context=...`
- [ ] Verify metafield definitions load correctly
- [ ] Verify namespace appears in metadata tags
- [ ] Edit a single field value
- [ ] Verify "Save All" button becomes enabled (not grayed)
- [ ] Click "Save All"
- [ ] Verify success message appears
- [ ] Refresh page and verify value persists
- [ ] Edit multiple fields at once
- [ ] Save all together
- [ ] Verify all values persist after refresh

### Data Integrity Testing
- [ ] List-type fields save as arrays correctly
- [ ] Required field validation still works
- [ ] Empty values handled properly
- [ ] JSON parsing doesn't fail with special characters

### Backward Compatibility
- [ ] Old `saveProductMetafield` function still exists (for reference)
- [ ] No breaking changes to `fetchProductMetafields` API
- [ ] Existing UI state management compatible

## Migration Notes
- No database migration required (schema unchanged, usage pattern changed)
- Old rows can coexist with new structure temporarily
- Consider cleanup of old single-value rows after verification

## Future Enhancements
- Add "Reset" button to revert changes without saving
- Add unsaved changes warning on page exit
- Add keyboard shortcut for save (Ctrl+S / Cmd+S)
- Show which fields have been modified (visual indicator)
- Add draft/auto-save functionality

## Files Modified
1. `app/actions/saveProductMetafieldsBundle.js` - NEW
2. `app/actions/fetchProductMetafields.js` - UPDATED
3. `components/meta-categories/ProductMetaEdit.js` - REFACTORED

## Files Unchanged
- `app/actions/saveProductMetafield.js` - Kept for reference/backward compatibility
- Database schema - No changes needed
- Other components - No changes needed
