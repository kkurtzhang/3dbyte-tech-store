import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { getMDXPost } from "@/lib/mdx";
import { MDXProvider } from "@/components/mdx/mdx-provider";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// Revalidate every hour
export const revalidate = 3600;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getMDXPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getMDXPost(slug);

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
            <time dateTime={post.date}>
              {format(new Date(post.date), "yyyy.MM.dd")}
            </time>
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

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono uppercase leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-xl text-muted-foreground leading-relaxed">
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
