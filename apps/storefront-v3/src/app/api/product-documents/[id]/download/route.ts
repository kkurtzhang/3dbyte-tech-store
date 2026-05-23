import { NextResponse } from "next/server";

import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return NextResponse.json(
      { error: "Download configuration is missing." },
      { status: 500 },
    );
  }

  const backendUrl = `${resolveMedusaBaseUrl({
    isServer: true,
  })}/store/product-documents/${encodeURIComponent(id)}/download`;

  const response = await fetch(backendUrl, {
    cache: "no-store",
    headers: {
      "x-publishable-api-key": publishableKey,
    },
    redirect: "manual",
  });

  const location = response.headers.get("location");

  if (response.status >= 300 && response.status < 400 && location) {
    return NextResponse.redirect(location, 302);
  }

  if (response.status === 404) {
    return NextResponse.json(
      { error: "Product document was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { error: "Product document download is unavailable." },
    { status: response.ok ? 502 : response.status },
  );
}
