export interface ShippingRate {
    id: string;
    carrier: CarrierInfo;
    service: string;
    serviceName: string;
    totalCharge: number;
    currency: string;
    estimatedDeliveryDays?: number;
    estimatedDeliveryDate?: string;
    transitDays?: number;
    metadata?: Record<string, unknown>;
}
export interface CarrierInfo {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    testMode?: boolean;
}
export interface TrackingEvent {
    date: string;
    description: string;
    location?: string;
    code?: string;
}
export interface TrackingInfo {
    trackingNumber: string;
    carrier: CarrierInfo;
    status: TrackingStatus;
    estimatedDelivery?: string;
    events: TrackingEvent[];
    signedBy?: string;
    deliveredAt?: string;
}
export type TrackingStatus = "unknown" | "pending" | "in_transit" | "out_for_delivery" | "delivered" | "failed_attempt" | "available_for_pickup" | "returned" | "cancelled";
export interface ShipmentLabel {
    id: string;
    trackingNumber: string;
    labelUrl: string;
    labelFormat: "PDF" | "PNG" | "ZPL";
    carrier: CarrierInfo;
    createdAt: string;
}
export interface ShipmentRequest {
    rates: ShippingRate[];
    selectedRateId: string;
    shipperAddress: ShippingAddress;
    recipientAddress: ShippingAddress;
    parcels: Parcel[];
}
export interface ShippingAddress {
    name?: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateCode?: string;
    postalCode: string;
    countryCode: string;
    phone?: string;
    email?: string;
}
export interface Parcel {
    weight: number;
    weightUnit: "KG" | "LB";
    width?: number;
    height?: number;
    length?: number;
    dimensionUnit?: "CM" | "IN";
    description?: string;
}
export interface LiveRateRequest {
    cartId: string;
}
export interface LiveRateResponse {
    success: boolean;
    rates: ShippingRate[];
    error?: string;
    cachedAt?: string;
}
//# sourceMappingURL=shipping.d.ts.map