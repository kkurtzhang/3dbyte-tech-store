import {
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  LockKeyhole,
  Search,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicDocumentDownloadUrl } from "@/lib/product-documents/download-url";
import { searchPublicProductDocuments } from "@/lib/product-documents/search";

const downloadsTitle = "Download Center - Manuals & Product Files";
const downloadsDescription =
  "Access public product manuals, datasheets, safety sheets, warranty notes, and installation files for 3D printing hardware and materials.";

export const metadata: Metadata = {
  title: downloadsTitle,
  description: downloadsDescription,
  alternates: {
    canonical: "/downloads",
  },
  openGraph: {
    title: downloadsTitle,
    description: downloadsDescription,
    url: "/downloads",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: downloadsTitle,
    description: downloadsDescription,
  },
};

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

const documentTypes = [
  { label: "Manuals", value: "manual" },
  { label: "Datasheets", value: "datasheet" },
  { label: "Install guides", value: "install_guide" },
  { label: "Safety sheets", value: "safety_sheet" },
  { label: "Warranty", value: "warranty" },
];

function buildTypeHref(value?: string) {
  return value ? `/downloads?type=${value}` : "/downloads";
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
    <main>
      <section className="border-b bg-muted/30">
        <div className="container py-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Public Files
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                Download Center
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                Find public product manuals, datasheets, safety sheets,
                warranty notes, and installation files. Private entitled files
                stay in your account after product registration.
              </p>
            </div>

            <form className="rounded-sm border border-border bg-background p-3 shadow-sm focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
              <div className="flex gap-2">
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Search by product, model, or document"
                  aria-label="Search public product documents"
                  className="h-11 rounded-sm focus-visible:ring-cyan-500"
                />
                {type ? <input type="hidden" name="type" value={type} /> : null}
                <Button type="submit" size="icon" className="rounded-sm" aria-label="Search downloads">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/guides"
              className="group rounded-sm border bg-background p-4 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/5"
            >
              <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
              <span className="mt-3 flex items-center justify-between gap-3">
                <span>
                  <span className="block font-medium group-hover:text-cyan-500 transition-colors">Product guides</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Learn setup, maintenance, materials, and tuning.
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-500" />
              </span>
            </Link>
            <Link
              href="/account/product-files"
              className="group rounded-sm border bg-background p-4 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/5"
            >
              <LockKeyhole className="h-5 w-5 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
              <span className="mt-3 flex items-center justify-between gap-3">
                <span>
                  <span className="block font-medium group-hover:text-cyan-500 transition-colors">Account files</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Unlock firmware and restricted files with serial registration.
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-500" />
              </span>
            </Link>
            <Link
              href="/docs"
              className="group rounded-sm border bg-background p-4 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/5"
            >
              <FileText className="h-5 w-5 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
              <span className="mt-3 flex items-center justify-between gap-3">
                <span>
                  <span className="block font-medium group-hover:text-cyan-500 transition-colors">Resource center</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Browse all customer support and learning destinations.
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-500" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-8 md:py-10">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Public Documents
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {total} {total === 1 ? "document" : "documents"} found
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildTypeHref()}
              className={`rounded-sm border px-3 py-2 text-sm font-mono transition-colors ${
                !type
                  ? "border-cyan-500 bg-cyan-500 text-slate-950 font-bold"
                  : "bg-background hover:border-cyan-500/50 hover:text-cyan-500"
              }`}
            >
              All files
            </Link>
            {documentTypes.map((documentType) => (
              <Link
                key={documentType.value}
                href={buildTypeHref(documentType.value)}
                className={`rounded-sm border px-3 py-2 text-sm font-mono transition-colors ${
                  type === documentType.value
                    ? "border-cyan-500 bg-cyan-500 text-slate-950 font-bold"
                    : "bg-background hover:border-cyan-500/50 hover:text-cyan-500"
                }`}
              >
                {documentType.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="divide-y rounded-sm border bg-background">
          {documents.map((document) => (
            <Link
              key={document.id}
              href={getPublicDocumentDownloadUrl(document.public_download_path)}
              className="group flex items-start justify-between gap-4 p-4 transition-colors hover:bg-muted/40 md:p-5"
            >
              <span className="flex min-w-0 gap-3">
                <span className="mt-1 rounded-sm bg-muted p-2 text-muted-foreground group-hover:text-cyan-500 group-hover:bg-cyan-500/10 transition-colors">
                  <Download className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground group-hover:text-cyan-500 transition-colors">
                    {document.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {document.product_title}
                    {document.version ? ` · ${document.version}` : ""}
                    {document.file_name ? ` · ${document.file_name}` : ""}
                  </span>
                </span>
              </span>
              <Badge variant="outline" className="shrink-0 rounded-sm font-mono text-[10px] uppercase border-cyan-500/30 text-cyan-500">
                {formatType(document.document_type)}
              </Badge>
            </Link>
          ))}
          {documents.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">No documents found</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Try another product name, document type, or model number. General
                learning articles are available in product guides.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
