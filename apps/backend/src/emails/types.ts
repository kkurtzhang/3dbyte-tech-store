export type EmailAddress = {
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  company?: string | null;
  country_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  postal_code?: string | null;
  province?: string | null;
};

export type EmailRawAmount = {
  value?: number | string | null;
  [key: string]: unknown;
};

export type EmailAmount =
  | number
  | string
  | {
      numeric?: number | string | null;
      raw?: EmailRawAmount | null;
      toJSON?: () => unknown;
      valueOf?: () => unknown;
      value?: number | string | null;
      [key: string]: unknown;
    };

export type EmailPreorderVariant = {
  available_date?: string | Date | null;
  status?: string | null;
};

export type OrderPlacedEmailItem = {
  detail?: {
    quantity?: EmailAmount | null;
    raw_quantity?: EmailRawAmount | null;
  } | null;
  id: string;
  item_subtotal?: EmailAmount | null;
  item_total?: EmailAmount | null;
  metadata?: Record<string, unknown> | null;
  product_title?: string | null;
  quantity?: EmailAmount | null;
  raw_item_subtotal?: EmailRawAmount | null;
  raw_item_total?: EmailRawAmount | null;
  raw_quantity?: EmailRawAmount | null;
  raw_subtotal?: EmailRawAmount | null;
  raw_total?: EmailRawAmount | null;
  subtotal?: EmailAmount | null;
  thumbnail?: string | null;
  title?: string | null;
  total?: EmailAmount | null;
  unit_price?: EmailAmount | null;
  variant?: {
    preorder_variant?: EmailPreorderVariant | null;
  } | null;
  variant_sku?: string | null;
  variant_title?: string | null;
};

export type OrderPlacedEmailShippingMethod = {
  amount?: EmailAmount | null;
  name?: string | null;
};

export type OrderPlacedEmailOrder = {
  billing_address?: EmailAddress | null;
  created_at: string | Date;
  currency_code: string;
  custom_display_id?: string | null;
  discount_total?: EmailAmount | null;
  display_id: number;
  email?: string | null;
  id: string;
  item_subtotal?: EmailAmount | null;
  item_total?: EmailAmount | null;
  items?: OrderPlacedEmailItem[] | null;
  raw_item_subtotal?: EmailRawAmount | null;
  raw_item_total?: EmailRawAmount | null;
  raw_shipping_subtotal?: EmailRawAmount | null;
  raw_shipping_total?: EmailRawAmount | null;
  raw_subtotal?: EmailRawAmount | null;
  raw_tax_total?: EmailRawAmount | null;
  raw_total?: EmailRawAmount | null;
  shipping_address?: EmailAddress | null;
  shipping_methods?: OrderPlacedEmailShippingMethod[] | null;
  shipping_subtotal?: EmailAmount | null;
  shipping_total?: EmailAmount | null;
  subtotal?: EmailAmount | null;
  tax_total?: EmailAmount | null;
  total?: EmailAmount | null;
};

export type OrderPlacedEmailStore = {
  name?: string | null;
};

export type RenderedEmail = {
  html: string;
  subject: string;
  text: string;
};
