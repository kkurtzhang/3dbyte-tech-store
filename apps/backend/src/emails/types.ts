export type EmailAddress = {
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  country_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  postal_code?: string | null;
  province?: string | null;
};

export type OrderPlacedEmailItem = {
  id: string;
  product_title?: string | null;
  quantity: number;
  thumbnail?: string | null;
  unit_price: number;
  variant_title?: string | null;
};

export type OrderPlacedEmailOrder = {
  created_at: string | Date;
  currency_code: string;
  discount_total?: number | null;
  display_id: number;
  email?: string | null;
  id: string;
  item_subtotal?: number | null;
  item_total?: number | null;
  items?: OrderPlacedEmailItem[] | null;
  shipping_address?: EmailAddress | null;
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
