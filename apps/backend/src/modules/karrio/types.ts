export interface KarrioModuleOptions {
  apiUrl: string;
  apiKey: string;
  testMode: boolean;
}

export interface KarrioAddress {
  person_name?: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_code?: string;
  postal_code: string;
  country_code: string;
  phone_number?: string;
  email?: string;
  residential?: boolean;
}

export interface KarrioParcel {
  weight: number;
  weight_unit: "KG" | "LB";
  width?: number;
  height?: number;
  length?: number;
  dimension_unit?: "CM" | "IN";
  description?: string;
  is_document?: boolean;
  packaging_type?: "your_packaging" | string;
}

export interface KarrioRateRequest {
  shipper: KarrioAddress;
  recipient: KarrioAddress;
  parcels: KarrioParcel[];
  services?: string[];
  carrier_ids?: string[];
  options?: Record<string, unknown>;
  payment?: Record<string, unknown>;
}

export interface KarrioRate {
  id: string;
  carrier_id: string;
  carrier_name: string;
  service?: string;
  total_charge: number;
  currency: string;
  transit_days?: number;
  estimated_delivery?: string;
  extra_charges?: KarrioCharge[];
  meta?: Record<string, unknown>;
  test_mode?: boolean;
}

export interface KarrioCharge {
  name: string;
  amount: number;
  currency: string;
}

export interface KarrioRateResponse {
  rates: KarrioRate[];
  messages?: KarrioMessage[];
}

export interface KarrioMessage {
  carrier_name?: string;
  carrier_id?: string;
  message: string;
  code?: string;
  level?: string;
}

export interface KarrioShipmentRequest {
  shipper: KarrioAddress;
  recipient: KarrioAddress;
  parcels: KarrioParcel[];
  service: string;
  carrier_ids?: string[];
  options?: Record<string, unknown>;
  payment?: Record<string, unknown>;
  label_type?: "PDF" | "PNG" | "ZPL";
  metadata?: Record<string, unknown>;
  selected_rate_id?: string;
  references?: string[];
}

export interface KarrioShipment {
  id: string;
  status: string;
  tracking_number: string;
  label_url?: string;
  tracking_url?: string;
  carrier_name: string;
  carrier_id: string;
  service: string;
  selected_rate?: KarrioRate;
  meta?: Record<string, unknown>;
  created_at: string;
}

export interface KarrioTracker {
  id: string;
  tracking_number: string;
  carrier_name: string;
  carrier_id: string;
  status: KarrioTrackingStatus;
  estimated_delivery?: string;
  events: KarrioTrackingEvent[];
  delivered?: boolean;
  signed_by?: string;
  meta?: Record<string, unknown>;
}

export type KarrioTrackingStatus =
  | "unknown"
  | "pending"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed_attempt"
  | "available_for_pickup"
  | "returned"
  | "cancelled";

export interface KarrioTrackingEvent {
  date: string;
  description: string;
  location?: string;
  code?: string;
}

export interface KarrioCarrier {
  id: string;
  carrier_id: string;
  carrier_name: string;
  display_name: string;
  test_mode: boolean;
  active: boolean;
  capabilities?: string[];
}

export interface KarrioVoidRequest {
  shipment_id: string;
}

export interface KarrioVoidResponse {
  id: string;
  carrier_name: string;
  carrier_id: string;
  success: boolean;
}
