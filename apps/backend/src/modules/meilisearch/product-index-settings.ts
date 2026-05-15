export const DEFAULT_PRODUCT_FILTERABLE_ATTRIBUTES = [
  "id",
  "handle",
  "brand.id",
  "category_ids",
  "collection_ids",
  "type_id",
  "on_sale",
  "in_stock",
  "is_bundle",
  "bundle_id",
  "price_aud",
  "options_colour",
  "options_size",
  "options_nozzle_type",
  "options_nozzle_size",
];

export const DEFAULT_PRODUCT_SORTABLE_ATTRIBUTES = [
  "created_at_timestamp",
  "price_aud",
];

export const DEFAULT_PRODUCT_SEARCHABLE_ATTRIBUTES = [
  "title",
  "rich_description",
  "bundle_item_titles",
  "variants.sku",
  "variants.title",
];

export const DEFAULT_PRODUCT_DISPLAYED_ATTRIBUTES = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "brand",
  "is_bundle",
  "bundle_id",
  "bundle_item_count",
  "bundle_item_titles",
  "price_aud",
  "tax_inclusive_price_aud",
  "options_colour",
  "options_size",
  "options_nozzle_type",
  "options_nozzle_size",
  "on_sale",
  "in_stock",
  "inventory_quantity",
  "categories",
  "_tags",
  "collection_ids",
  "type_id",
  "created_at_timestamp",
  "variants",
];
