import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { getStrapiContent } from "@/lib/strapi/content";
import { CmsContent } from "@/features/cms/components/cms-content";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// Revalidate every hour
export const revalidate = 3600;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

interface BlogPost {
  id: number;
  attributes: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    publishedAt: string;
    seo_title?: string;
    seo_description?: string;
    cover?: {
      data?: {
        attributes: {
          url: string;
          alternativeText?: string;
        };
      };
    };
    author?: {
      data?: {
        attributes: {
          name: string;
        };
      };
    };
  };
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await getStrapiContent<{ data: BlogPost[] }>("posts", {
      filters: {
        slug: {
          $eq: slug,
        },
      },
    });
    return response.data[0] || null;
  } catch (error) {
    console.error(`Failed to fetch blog post ${slug}:`, error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.attributes.seo_title || post.attributes.title,
    description: post.attributes.seo_description || post.attributes.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="container py-12 max-w-4xl">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="pl-0 hover:bg-transparent hover:text-primary"
        >
          <Link href="/blog">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Log
          </Link>
        </Button>
      </div>

      <article>
        <header className="space-y-4 mb-8">
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <time dateTime={post.attributes.publishedAt}>
              {format(new Date(post.attributes.publishedAt), "yyyy.MM.dd")}
            </time>
            {post.attributes.author?.data && (
              <>
                <span>/</span>
                <span>{post.attributes.author.data.attributes.name}</span>
              </>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono uppercase leading-tight">
            {post.attributes.title}
          </h1>

          {post.attributes.excerpt && (
            <p className="text-xl text-muted-foreground leading-relaxed">
              {post.attributes.excerpt}
            </p>
          )}
        </header>

        <Separator className="my-8" />

        <CmsContent content={post.attributes.content} />
      </article>
    </div>
  );
}
