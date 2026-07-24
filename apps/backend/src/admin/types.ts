import {
  AdminProduct,
  FindParams,
  PaginatedResponse,
} from "@medusajs/framework/types";

export type AdminBrand = {
  id: string;
  name: string;
  handle: string;
  products: AdminProduct[];
};
export type AdminBrandResponse = {
  brand: AdminBrand;
};

export type AdminBrandsResponse = PaginatedResponse<{
  brands: AdminBrand[];
}>;

export type AdminCreateBrand = {
  name: string;
  handle?: string;
};

export type AdminCreateBrandResponse = {
  id: string;
  name: string;
  handle: string;
};

export type AdminUpdateBrand = {
  name: string;
  handle?: string;
};

export type AdminUpdateBrandResponse = {
  id: string;
  name: string;
  handle: string;
};

export interface BrandQueryParams extends FindParams {}

export type RemoveProductFromBrandParams = {
  products: string[];
};

export type AddProductToBrandParams = {
  products: string[];
};

export type UpdateLinkParams = {
  products: string[];
};

export type BatchDismissLinksBrandsProductsParams = {
  ids: { product_id: string; brand_id: string }[];
};

export type AdminBundledProductItem = {
  id: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
  } | {
    id: string;
    title: string;
  }[] | null;
};

export type AdminBundledProduct = {
  id: string;
  title: string;
  product?: {
    id: string;
    title?: string | null;
  } | {
    id: string;
    title?: string | null;
  }[] | null;
  items?: AdminBundledProductItem[] | null;
  created_at: string;
  updated_at: string;
};

export type AdminBundledProductsResponse = {
  bundled_products: AdminBundledProduct[];
  count: number;
  limit: number;
  offset: number;
};

export interface BundledProductQueryParams extends FindParams {}

export type AdminWaitlistEntry = {
  id: string;
  customer_email: string;
  customer_id?: string | null;
  product_id: string;
  product_variant_id?: string | null;
  product_handle: string;
  product_title: string;
  variant_title?: string | null;
  notified: boolean;
  notification_count?: number | null;
  created_at?: string | null;
  notified_at?: string | null;
  last_notified_at?: string | null;
};

export type AdminWaitlistDemand = {
  product_id: string;
  product_variant_id: string | null;
  product_handle: string;
  product_title: string;
  variant_title: string | null;
  queued_count: number;
  notified_count: number;
  total_count: number;
};

export type AdminWaitlistEntriesResponse = {
  entries: AdminWaitlistEntry[];
  count: number;
  limit: number;
  offset: number;
};

export type AdminWaitlistDemandResponse = {
  demand: AdminWaitlistDemand[];
};

export interface WaitlistQueryParams extends FindParams {
  product_id?: string;
  q?: string;
  status?: "all" | "queued" | "notified";
}

export type SendWaitlistTestNotificationParams = {
  email: string;
  waitlist_id: string;
};

export type AdminSupportTicket = {
  id: string;
  ticket_number: string;
  status: string;
  priority: string;
  category: string;
  source: string;
  subject: string;
  customer_name: string;
  customer_email: string;
  customer_id?: string | null;
  order_id?: string | null;
  order_reference?: string | null;
  product_id?: string | null;
  product_handle?: string | null;
  assigned_admin_id?: string | null;
  ai_summary?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_message_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
};

export type AdminSupportTicketMessage = {
  id: string;
  ticket_id: string;
  author_type: string;
  direction: string;
  visibility: string;
  body: string;
  author_name?: string | null;
  author_email?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type AdminSupportTicketEvent = {
  id: string;
  ticket_id: string;
  type: string;
  from_value?: string | null;
  to_value?: string | null;
  actor_type?: string | null;
  actor_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type AdminSupportTicketsResponse = {
  tickets: AdminSupportTicket[];
  count: number;
  limit: number;
  offset: number;
};

export type AdminSupportTicketResponse = {
  ticket: AdminSupportTicket;
  messages: AdminSupportTicketMessage[];
  events: AdminSupportTicketEvent[];
};

export interface SupportTicketQueryParams extends FindParams {
  category?: string;
  q?: string;
  source?: string;
  status?: string;
}

export type UpdateSupportTicketStatusParams = {
  status: string;
};

export type AdminSupportTicketStatusResponse = {
  ticket: AdminSupportTicket;
};

export type CreateSupportTicketMessageParams = {
  body: string;
  visibility: "customer" | "internal";
};

export type AdminSupportTicketMessageResponse = {
  message: AdminSupportTicketMessage;
};

export type AdminAiProductDraft = {
  id: string;
  status: string;
  packet_version?: number | null;
  source_agent?: string | null;
  request_id?: string | null;
  requested_operation?: "auto" | "create" | "enrich" | null;
  resolved_operation?: "create" | "enrich" | null;
  resolution_status?: string | null;
  identity_candidates?: AdminAiProductDraftCandidate[] | null;
  product_id?: string | null;
  product_handle?: string | null;
  product_input?: Record<string, unknown> | null;
  source_summary?: Record<string, unknown> | null;
  raw_packet?: Record<string, unknown> | null;
  normalized_draft?: Record<string, unknown> | null;
  current_snapshot?: Record<string, unknown> | null;
  snapshot_hash?: string | null;
  proposed_changes?: AdminAiProductDraftChange[] | null;
  approved_changes?: AdminAiProductDraftChange[] | null;
  approved_import_targets?: AdminAiProductDraftImportTargets | null;
  approved_snapshot_hash?: string | null;
  import_progress?: Record<string, unknown> | null;
  sources?: unknown[] | null;
  warnings?: string[] | null;
  confidence_summary?: Record<string, unknown> | null;
  validation_errors?: unknown[] | null;
  normalizer?: string | null;
  normalizer_trace_id?: string | null;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  imported_by?: string | null;
  imported_at?: string | null;
  import_summary?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminAiProductDraftCandidate = {
  id: string;
  handle?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AdminAiProductDraftChange = {
  path: string;
  current_value?: unknown;
  proposed_value?: unknown;
  disposition?: "missing" | "conflict";
  default_selected?: boolean;
  evidence?: {
    claim_path?: string;
    source_url?: string;
    source_type?: string;
    confidence?: number;
    value?: unknown;
  } | null;
};

export type AdminAiProductDraftImportTargets = {
  medusa_metadata: boolean;
  strapi_description_draft: boolean;
  product_document_drafts: boolean;
};

export type AdminAiProductDraftEvent = {
  id: string;
  draft_id: string;
  type: string;
  actor_type?: string | null;
  actor_id?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type AdminAiProductDraftsResponse = {
  drafts: AdminAiProductDraft[];
  count: number;
  limit: number;
  offset: number;
};

export type AdminAiProductDraftResponse = {
  draft: AdminAiProductDraft;
  events: AdminAiProductDraftEvent[];
};

export interface AiProductDraftQueryParams extends FindParams {
  q?: string;
  source_agent?: string;
  status?: string;
}

export type AdminAiProductDraftRejectParams = {
  reason: string;
};

export type AdminAiProductDraftApproveParams = {
  notes?: string;
  selected_change_paths: string[];
  import_targets: AdminAiProductDraftImportTargets;
  snapshot_hash?: string | null;
};

export type AdminAiProductDraftResolveParams =
  | {
      operation: "create";
    }
  | {
      operation: "enrich";
      product_id: string;
    };

export type AdminAiProductDraftImportParams = {
  import_targets?: Partial<AdminAiProductDraftImportTargets>;
};

export type AdminAiProductDraftActionResponse = {
  draft: AdminAiProductDraft;
};
