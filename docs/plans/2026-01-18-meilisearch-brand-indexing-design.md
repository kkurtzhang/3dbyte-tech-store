# Meilisearch Brand Indexing - Event-Driven Design

## Overview

This document outlines the architecture for a robust, event-driven brand syncing system between Medusa, Strapi, and Meilisearch. The system decouples "Basic" indexing (immediate availability) from "Rich" indexing (content consistency), ensuring reliability and performance.

**Date:** 2026-01-18
**Status:** ✅ Implementation Complete

---

## Goals

1.  **Immediate Availability:** Brands are searchable (ID, Name) immediately after creation in Medusa.
2.  **Rich Content Sync:** Detailed content (Logos, Descriptions) is synced from Strapi asynchronously.
3.  **Resilience:** Failures in Strapi sync do not block Basic indexing.
4.  **Event-Driven:** Uses Medusa Events and Strapi Webhooks to trigger workflows.
5.  **Retry Strategies:** Specific retry configurations for different network/service reliability profiles.

---

## Architecture & Flows

### Flow 1: Brand Created/Updated (Medusa Origin)

**Trigger:** `brand.created`, `brand.updated`
**Subscriber:** `src/subscribers/brand-sync.ts`

This subscriber triggers two parallel workflows:

**1. Workflow A: `index-basic-brand-workflow`**
*   **Goal:** Instant search availability.
*   **Step:** `index-brand-step`
*   **Config:** `{ maxRetries: 3, retryInterval: 2 }`
*   **Action:** Upserts `id`, `name`, `handle`, `created_at` to Meilisearch.

**2. Workflow B: `sync-brand-to-strapi-workflow`**
*   **Goal:** Push master data to Strapi.
*   **Step:** `push-brand-to-strapi-step`
*   **Config:** `{ maxRetries: 10, retryInterval: 60 }`
*   **Action:** Creates or Updates the Brand entry in Strapi with `medusa_id`, `name`, `handle`.

### Flow 2: Strapi Updates (Rich Content Loop)

**Trigger:** Strapi Webhook (`entry.publish`, `entry.unpublish`, `entry.delete`)
**Subscriber:** `src/subscribers/meilisearch-brand-webhook.ts`

**Logic:**
*   **On `publish`:** Trigger **Workflow C**.
*   **On `unpublish`:** Trigger **Workflow A** (Re-indexes basic info only, effectively removing rich fields).
*   **On `delete`:** Trigger **Workflow D** (Removes from Meilisearch).

**Workflow C: `index-rich-brand-workflow`**
*   **Goal:** Index fully enriched brand data.
*   **Step 1:** `fetch-brand-details-step` (Get product count from Medusa).
*   **Step 2:** `index-brand-step` (Upsert).
*   **Config:** `{ maxRetries: 5, retryInterval: 2 }`
*   **Action:** Merges Strapi payload (Logo, Description) + Medusa Data + Product Count into Meilisearch.

### Flow 3: Brand Deletion (Medusa Origin)

**Trigger:** `brand.deleted`
**Subscriber:** `src/subscribers/brand-sync.ts`

**Workflow D: `delete-brand-workflow`**
*   **Step 1:** `delete-from-meilisearch-step` (Immediate).
*   **Step 2:** `delete-from-strapi-step` (Background).
    *   **Config:** `{ maxRetries: 3, retryInterval: 10 }`

---

## Data Model

### MeilisearchBrandDocument

```typescript
export interface MeilisearchBrandDocument {
  // Primary Key
  id: string

  // Basic Info (Flow 1)
  name: string
  handle: string
  created_at: number

  // Rich Info (Flow 2)
  detailed_description?: string
  brand_logo?: string[]
  meta_keywords?: string[]

  // Calculated (Flow 2 & Product Link Events)
  product_count: number
}
```

---

## Workflow Step Definitions

### 1. `index-brand-step`
*   **Input:** `{ brand: Brand, strapiPayload?: any, productCount?: number }`
*   **Logic:**
    *   Constructs `MeilisearchBrandDocument`.
    *   If `strapiPayload` is present, maps `brand_logo`, `detailed_description`.
    *   If absent, sends only basic fields (Meilisearch `updateDocuments` handles partial updates).
*   **Retry:** Configurable per workflow.

### 2. `push-brand-to-strapi-step`
*   **Input:** `{ brand: Brand }`
*   **Logic:**
    *   Check if Brand exists in Strapi (via `medusa_id`).
    *   **Exists:** PUT update.
    *   **Missing:** POST create.
*   **Retry:** `{ maxRetries: 10, retryInterval: 60 }`

### 3. `delete-from-strapi-step`
*   **Input:** `{ id: string }`
*   **Logic:** DELETE request to Strapi by `medusa_id`.

---

## Retry Configuration Summary

| Workflow Step | Max Retries | Interval (sec) | Rationale |
| :--- | :--- | :--- | :--- |
| **Basic Indexing** | 3 | 2 | Fast fail/retry for immediate availability. |
| **Sync to Strapi** | 10 | 60 | High resilience for external service (Strapi) downtime. |
| **Rich Indexing** | 5 | 2 | Moderate retries for processing callbacks. |

---

## Implementation Plan

1.  **Configuration:** Update `MeilisearchModule` config and types. ✅
2.  **Steps:** Implement the 3 core steps (`index-brand`, `push-to-strapi`, `delete-from-strapi`). ✅
3.  **Workflows:** Assemble Workflows A, B, C, D. ✅
4.  **Subscribers:** Implement `brand-sync` (Medusa events) and `meilisearch-brand-webhook` (Strapi events). ✅
5.  **Testing:**
    *   Unit tests for transformers. ✅
    *   Integration tests for workflows (mocking Strapi). ⏳ (Existing smoke tests)
    *   E2E test of the full loop. ⏳

---

## Implementation Details

### Files Created/Modified

#### Steps (`src/workflows/meilisearch/steps/`)
- `index-brand-step.ts` - Indexes brand to Meilisearch (basic or rich)
- `push-brand-to-strapi-step.ts` - Pushes brand data to Strapi
- `delete-from-strapi-step.ts` - Deletes brand from Strapi

#### Workflows (`src/workflows/meilisearch/`)
- `index-basic-brand-workflow.ts` - Workflow A: Immediate indexing
- `sync-brand-to-strapi-workflow.ts` - Workflow B: Push to Strapi
- `index-rich-brand-workflow.ts` - Workflow C: Rich indexing with Strapi data
- `delete-brand-workflow.ts` - Workflow D: Delete from both services

#### Subscribers (`src/subscribers/`)
- `brand-created.ts` - Triggers Workflows A + B in parallel
- `brand-updated.ts` - Triggers Workflows A + B in parallel
- `brand-deleted.ts` - Triggers Workflow D

#### Webhook Handler (`src/api/webhooks/strapi/route.ts`)
- Updated to handle `entry.publish`, `entry.unpublish`, `entry.delete` events
- Routes to appropriate workflows based on event type

### Tests Created
- `src/workflows/meilisearch/steps/__tests__/index-brand-step.unit.spec.ts`
- `src/workflows/meilisearch/steps/__tests__/push-brand-to-strapi-step.unit.spec.ts`
- `src/workflows/meilisearch/steps/__tests__/delete-from-strapi-step.unit.spec.ts`
- `src/workflows/meilisearch/__tests__/index-basic-brand-workflow.unit.spec.ts`
- `src/workflows/meilisearch/__tests__/sync-brand-to-strapi-workflow.unit.spec.ts`
- `src/workflows/meilisearch/__tests__/index-rich-brand-workflow.unit.spec.ts`
- `src/workflows/meilisearch/__tests__/delete-brand-workflow.unit.spec.ts`
- `src/subscribers/__tests__/brand-sync.unit.spec.ts`
