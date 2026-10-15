/** Catalogue discovery is not approved compatibility/specification evidence. */
export type ProductSearchMode = "search" | "browse";
export type ProductSearchStatus = "matches" | "empty" | "unavailable";
export interface ProductSearchSummary {
  status: ProductSearchStatus;
  mode: ProductSearchMode;
  query: string;
}

export interface AssistantProductAction {
  id: string;
  title: string;
  /** Validated relative same-store product path, never model-authored. */
  href: string;
  match: "search" | "alternative" | "browse";
}

/** Sent only as transient data from the current server tool execution. */
export interface AssistantProductSearchEvent {
  messageId: string;
  callId: string;
  status: ProductSearchStatus | "declined";
  mode: ProductSearchMode;
  query: string;
  products: AssistantProductAction[];
}
