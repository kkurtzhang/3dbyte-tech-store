import type {
  ApprovedKnowledgeDocument,
  KnowledgeDocumentBody,
} from "@3dbyte-tech-store/shared-types/src/knowledge-reference";
export function isKnowledgeRecord(
  value: unknown,
): value is Record<string, unknown>;
export function knowledgeIdentifier(value: unknown): value is string;
export function knowledgeDigest(value: unknown): value is string;
export const KNOWLEDGE_MAX_AGE_MS: number;
export function parseKnowledgeBody(raw: unknown): KnowledgeDocumentBody | null;
export function parseApprovedKnowledgeDocument(
  raw: unknown,
  now?: number,
): ApprovedKnowledgeDocument | null;
