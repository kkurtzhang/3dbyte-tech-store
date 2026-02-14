import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/strapi/content";
import { MdxContent } from "@/features/cms/components/mdx-content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const response = await getBlogPosts({ limit: 100 });
    return response.data.map((post) => ({
      slug: post.Slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const response = await getBlogPostBySlug(slug);
    const post = response.data[0];
    if (!post) return { title: "Post Not Found" };

    return {
      title: post.Title,
      description: post.Excerpt || post.Title,
    };
  } catch {
    return { title: "Post Not Found" };
  }
}

export const revalidate = 3600;

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  let post;
  try {
    const response = await getBlogPostBySlug(slug);
    post = response.data[0];
  } catch {
    // Use fallback
  }

  if (!post) {
    notFound();
  }

  const readTime = Math.ceil(post.Content.split(/\s+/).length / 200);

  return (
    <div className="container py-12 md:py-16">
      {/* Breadcrumbs */}
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/blog" className="hover:text-primary">
          Blog
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{post.Title}</span>
      </nav>

      <article className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4">{post.Title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>•</span>
            <span>{readTime} min read</span>
            {post.Categories?.[0] && (
              <>
                <span>•</span>
                <Link
                  href={`/blog?category=${post.Categories[0].Slug}`}
                  className="px-3 py-1 rounded-full bg-muted text-xs hover:bg-muted/80 transition-colors"
                >
                  {post.Categories[0].Title}
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {post.FeaturedImage && (
          <div className="aspect-video relative rounded-lg overflow-hidden mb-8">
            <Image
              src={post.FeaturedImage.url}
              alt={post.FeaturedImage.alternativeText || post.Title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <MdxContent content={post.Content} />
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t">
          <Link
            href="/blog"
            className="text-primary hover:underline"
          >
            ← Back to Blog
          </Link>
        </footer>
      </article>
    </div>
  );
}
