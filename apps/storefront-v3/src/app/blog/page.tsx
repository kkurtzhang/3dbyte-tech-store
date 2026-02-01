import Link from "next/link";
import { Metadata } from "next";
import { getStrapiContent } from "@/lib/strapi/content";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Blog",
  description: "Latest news, tutorials, and updates from the 3D Byte Tech lab.",
};

// Revalidate every hour
export const revalidate = 3600;

interface BlogPost {
  id: number;
  attributes: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    publishedAt: string;
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

async function getBlogPosts() {
  try {
    const response = await getStrapiContent<{ data: BlogPost[] }>("posts", {
      sort: ["publishedAt:desc"],
      pagination: {
        page: 1,
        pageSize: 12,
      },
    });
    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch blog posts:", error);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="container py-12">
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight font-mono uppercase">
          Transmission_Log
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Latest updates, technical guides, and research from our engineering
          team.
        </p>
      </div>

      <Separator className="my-8" />

      {posts.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground font-mono">
          No_Transmissions_Found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.attributes.slug}`}>
              <Card className="h-full hover:bg-muted/50 transition-colors flex flex-col">
                <CardHeader>
                  <div className="text-xs font-mono text-muted-foreground mb-2">
                    {format(
                      new Date(post.attributes.publishedAt),
                      "yyyy.MM.dd",
                    )}
                  </div>
                  <CardTitle className="line-clamp-2 leading-tight">
                    {post.attributes.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {post.attributes.excerpt}
                  </p>
                </CardContent>
                <CardFooter className="text-xs font-mono text-primary uppercase">
                  Read_Entry &gt;
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
