import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicDocumentDownloadUrl } from "@/lib/product-documents/download-url";
import { searchPublicProductDocuments } from "@/lib/product-documents/search";

interface DownloadsPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
}

function formatType(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DownloadsPage({
  searchParams,
}: DownloadsPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const type = params.type || undefined;
  const { documents, total } = await searchPublicProductDocuments({
    query,
    type,
  });

  return (
    <main className="container py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Download Center
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Search public manuals, datasheets, safety sheets, and installation guides.
          </p>
        </div>
        <form className="flex w-full gap-2 md:w-[420px]">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by product, model, or document"
            aria-label="Search public product documents"
          />
          {type ? <input type="hidden" name="type" value={type} /> : null}
          <Button type="submit" size="icon" aria-label="Search downloads">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        {total} {total === 1 ? "document" : "documents"} found
      </div>

      <div className="divide-y rounded-sm border">
        {documents.map((document) => (
          <Link
            key={document.id}
            href={getPublicDocumentDownloadUrl(document.public_download_path)}
            className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
          >
            <span className="flex min-w-0 gap-3">
              <FileText className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block font-medium text-foreground">
                  {document.title}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {document.product_title}
                  {document.version ? ` · ${document.version}` : ""}
                </span>
              </span>
            </span>
            <Badge variant="outline" className="shrink-0">
              {formatType(document.document_type)}
            </Badge>
          </Link>
        ))}
        {documents.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No public documents matched your search.
          </div>
        ) : null}
      </div>
    </main>
  );
}
