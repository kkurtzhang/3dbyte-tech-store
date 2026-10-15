import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@medusajs/dashboard/css";
import MeilisearchPage from "../../../src/admin/routes/settings/meilisearch/page";
import { sdk } from "../../../src/admin/lib/sdk";

const ids = ["mu3sv3poa965a25lvvlbdngc", "uur1zr0pe99e6px1r5ljs0nm"];
const mode = new URLSearchParams(location.search).get("mode") || "success";
const requests = [];
sdk.client.fetch = async (path, options = {}) => {
 if (path === "/admin/meilisearch/sync-addresses" && !options.method) return { enabled: false, status: "disabled" };
 requests.push({path, options});
 document.querySelector("#requests").textContent = JSON.stringify(requests);
 if (path !== "/admin/meilisearch/sync-product-documents/scoped" || options.method !== "POST") throw new Error("Unexpected fixture mutation");
 if (mode === "slow") await new Promise(resolve => { window.finishFixtureSync = resolve; });
 if (["401","403","503"].includes(mode)) throw Object.assign(new Error("synthetic private server detail"), {status:Number(mode)});
 return { document_ids: ids, indexed: mode === "partial" ? 1 : 2, deleted: 0, knowledge_indexed: 2 };
};
createRoot(document.getElementById("root")).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MeilisearchPage/><output id="requests" aria-label="Fixture mutation requests" hidden>[]</output></QueryClientProvider>);
