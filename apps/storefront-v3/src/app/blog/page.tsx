import Link from "next/link";
import { Metadata } from "next";
import { getMDXPosts } from "@/lib/mdx";
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

export default async function BlogPage() {
  const posts = await getMDXPosts();

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
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="h-full hover:bg-muted/50 transition-colors flex flex-col">
                <CardHeader>
                  <div className="text-xs font-mono text-muted-foreground mb-2">
                    {format(new Date(post.date), "yyyy.MM.dd")}
                  </div>
                  <CardTitle className="line-clamp-2 leading-tight">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {post.excerpt}
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
