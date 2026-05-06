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
};

export type OrderPlacedEmailItem = {
  detail?: {
    quantity?: number | null;
  } | null;
  id: string;
  item_subtotal?: number | null;
  item_total?: number | null;
  product_title?: string | null;
  quantity?: number | null;
  raw_item_subtotal?: EmailRawAmount | null;
  raw_item_total?: EmailRawAmount | null;
  raw_subtotal?: EmailRawAmount | null;
  raw_total?: EmailRawAmount | null;
  subtotal?: number | null;
  thumbnail?: string | null;
  title?: string | null;
  total?: number | null;
  unit_price?: number | null;
  variant_sku?: string | null;
  variant_title?: string | null;
};

export type OrderPlacedEmailShippingMethod = {
  amount?: number | null;
  name?: string | null;
};

export type OrderPlacedEmailOrder = {
  billing_address?: EmailAddress | null;
  created_at: string | Date;
  currency_code: string;
  custom_display_id?: string | null;
  discount_total?: number | null;
  display_id: number;
  email?: string | null;
  id: string;
  item_subtotal?: number | null;
  item_total?: number | null;
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
  shipping_subtotal?: number | null;
  shipping_total?: number | null;
  subtotal?: number | null;
  tax_total?: number | null;
  total?: number | null;
};

export type OrderPlacedEmailStore = {
  name?: string | null;
};

export type RenderedEmail = {
  html: string;
  subject: string;
  text: string;
};
