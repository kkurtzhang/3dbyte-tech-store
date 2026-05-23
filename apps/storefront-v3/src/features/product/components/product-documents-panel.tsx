import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { getPublicDocumentDownloadUrl } from "@/lib/product-documents/download-url";
import type { PublicProductDocument } from "@/lib/product-documents/types";

interface ProductDocumentsPanelProps {
  documents: PublicProductDocument[];
}

function formatDocumentType(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProductDocumentsPanel({
  documents,
}: ProductDocumentsPanelProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <section className="rounded-sm border bg-card">
      <div className="border-b bg-muted/50 px-4 py-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Downloads
        </h3>
      </div>
      <div className="divide-y">
        {documents.map((document) => (
          <Link
            key={document.id}
            href={getPublicDocumentDownloadUrl(document.public_download_path)}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
          >
            <span className="flex min-w-0 items-center gap-3">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {document.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatDocumentType(document.document_type)}
                  {document.version ? ` · ${document.version}` : ""}
                </span>
              </span>
            </span>
            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}
