"use client";

import { useState } from "react";
import { Download, FileArchive } from "lucide-react";
import { createProductFileDownloadAction } from "@/app/actions/product-files";
import { Button } from "@/components/ui/button";
import type { CustomerProductFile } from "@/lib/product-documents/types";

interface ProductFilesListProps {
  productFiles: CustomerProductFile[];
}

function formatType(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProductFilesList({ productFiles }: ProductFilesListProps) {
  const [pendingFileId, setPendingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(fileId: string) {
    setPendingFileId(fileId);
    setError(null);
    const result = await createProductFileDownloadAction(fileId);
    setPendingFileId(null);

    if (result.success) {
      window.location.href = result.url;
      return;
    }

    setError(result.error);
  }

  if (productFiles.length === 0) {
    return (
      <div className="rounded-sm border p-8 text-center text-sm text-muted-foreground">
        No restricted product files are unlocked yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="divide-y rounded-sm border">
        {productFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="flex min-w-0 gap-3">
              <FileArchive className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{file.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatType(file.document_type)}
                  {file.version ? ` · ${file.version}` : ""}
                  {" · "}
                  Serial {file.registration.serial_number}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownload(file.id)}
              disabled={pendingFileId === file.id}
            >
              <Download className="mr-2 h-4 w-4" />
              {pendingFileId === file.id ? "Preparing..." : "Download"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
