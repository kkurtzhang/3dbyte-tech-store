import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { getMDXPost } from "@/lib/mdx";
import { getBlogPostBySlug } from "@/lib/strapi/content";
import type { MDXPostWithContent } from "@/lib/mdx";
import type { BlogPost, StrapiImage } from "@/lib/strapi/types";
import { MDXProvider } from "@/components/mdx/mdx-provider";
import { MdxContent } from "@/features/cms/components/mdx-content";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// Revalidate every hour
export const revalidate = 3600;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getCmsBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await getBlogPostBySlug(slug);
    return response.data?.[0] ?? null;
  } catch {
    return null;
  }
}

function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Undated";
  return format(date, "yyyy.MM.dd");
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean);
}

function normalizeKeywords(value?: string[] | null) {
  if (!Array.isArray(value)) return undefined;

  const keywords = value.map((keyword) => keyword.trim()).filter(Boolean);
  return keywords.length > 0 ? keywords : undefined;
}

function getStrapiImageUrl(image?: StrapiImage | null) {
  const imageUrl = image?.url?.trim();
  if (!imageUrl) return undefined;

  try {
    return new URL(
      imageUrl,
      process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    ).toString();
  } catch {
    return imageUrl;
  }
}

function getOpenGraphImage(post: BlogPost) {
  const image = post.open_graph_image || post.FeaturedImage;
  const url = getStrapiImageUrl(image);
  if (!image || !url) return undefined;

  return [
    {
      url,
      width: image.width,
      height: image.height,
      alt: image.alternativeText || post.Title,
    },
  ];
}

function buildCmsPostMetadata(post: BlogPost): Metadata {
  const title = firstText(post.seo_title, post.Title) || post.Title;
  const description = firstText(post.seo_description, post.Excerpt);
  const keywords = normalizeKeywords(post.search_keywords);
  const images = getOpenGraphImage(post);

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    openGraph: {
      title,
      ...(description ? { description } : {}),
      ...(images ? { images } : {}),
    },
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cmsPost = await getCmsBlogPost(slug);

  if (cmsPost) {
    return buildCmsPostMetadata(cmsPost);
  }

  const mdxPost = await getMDXPost(slug);

  if (!mdxPost) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: mdxPost.title,
    description: mdxPost.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const cmsPost = await getCmsBlogPost(slug);

  if (cmsPost) {
    return <CmsBlogArticle post={cmsPost} />;
  }

  const mdxPost = await getMDXPost(slug);

  if (!mdxPost) {
    notFound();
  }

  return <LocalMdxArticle post={mdxPost} />;
}

function BlogBackLink() {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className="pl-0 hover:bg-transparent hover:text-primary"
    >
      <Link href="/blog">
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to Blog
      </Link>
    </Button>
  );
}

function CmsBlogArticle({ post }: { post: BlogPost }) {
  return (
    <div className="container max-w-4xl py-12 md:py-16">
      <div className="mb-8">
        <BlogBackLink />
      </div>

      <article>
        <header className="mb-8 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
            <time dateTime={post.publishedAt}>
              {formatPostDate(post.publishedAt)}
            </time>
            {post.Categories?.map((category) => (
              <Link
                key={category.documentId}
                href={`/blog?category=${category.Slug}`}
                className="rounded-full border px-3 py-1 uppercase tracking-normal transition-colors hover:border-primary hover:text-primary"
              >
                {category.Title}
              </Link>
            ))}
          </div>

          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {post.Title}
          </h1>

          {post.Excerpt && (
            <p className="text-lg leading-8 text-muted-foreground md:text-xl">
              {post.Excerpt}
            </p>
          )}
        </header>

        <Separator className="my-8" />

        <MdxContent content={post.Content} />
      </article>
    </div>
  );
}

function LocalMdxArticle({ post }: { post: MDXPostWithContent }) {
  return (
    <div className="container max-w-4xl py-12 md:py-16">
      <div className="mb-8">
        <BlogBackLink />
      </div>

      <article>
        <header className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            {post.author && (
              <>
                <span>/</span>
                <span>{post.author}</span>
              </>
            )}
            {post.tags && post.tags.length > 0 && (
              <>
                <span>/</span>
                <span className="uppercase">{post.tags.join(", ")}</span>
              </>
            )}
          </div>

          <h1 className="font-mono text-3xl font-bold uppercase leading-tight tracking-tight md:text-4xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-xl leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}
        </header>

        <Separator className="my-8" />

        <div className="prose prose-mono max-w-none">
          <MDXProvider content={post.content} />
        </div>
      </article>
    </div>
  );
}
