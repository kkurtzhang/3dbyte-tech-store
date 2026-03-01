import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getBlogPosts, getBlogPostCategories } from "@/lib/strapi/content";
import type { BlogPost, BlogPostCategory } from "@/lib/strapi/types";

// Force dynamic rendering to avoid build-time CMS dependency
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Blog",
  description: "Latest news, tutorials, and insights from 3DByte Tech.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;

  let posts: BlogPost[] = [];
  let categories: BlogPostCategory[] = [];

  try {
    const [postsResponse, categoriesResponse] = await Promise.all([
      getBlogPosts({ category, query: q, limit: 100 }),
      getBlogPostCategories(),
    ]);
    posts = postsResponse.data || [];
    categories = categoriesResponse.data || [];
  } catch {
  }

  const normalizeCategory = (title: string) => {
    const lower = title.trim().toLowerCase();
    if (lower === "all post" || lower === "all posts") return "All Posts";
    if (lower === "ranking") return "Featured";
    return title;
  };

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Blog</h1>
        <p className="text-lg text-muted-foreground">
          News, tutorials, and insights from the 3DByte Tech team.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="font-semibold mb-4">Categories</h2>
            <div className="space-y-2">
              <Link
                href="/blog"
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  !category ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                All Posts
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/blog?category=${cat.Slug}`}
                  className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                    category === cat.Slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {normalizeCategory(cat.Title)}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Posts Grid */}
        <div className="lg:col-span-3">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                <span className="text-4xl">📝</span>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                {category || q ? "No posts found" : "Coming Soon"}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {category || q
                  ? "Try adjusting your filters or search query."
                  : "We're working on bringing you great content about 3D printing, technology, and maker projects."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.Slug}`}
                  className="group rounded-lg border overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {post.FeaturedImage && (
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={post.FeaturedImage.url}
                        alt={post.FeaturedImage.alternativeText || post.Title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {post.Title}
                    </h3>
                    {post.Excerpt && (
                      <p className="text-muted-foreground line-clamp-2 mb-3">
                        {post.Excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <time dateTime={post.publishedAt}>
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      {post.Categories?.[0] && (
                        <span className="px-2 py-1 rounded-full bg-muted text-xs">
                          {normalizeCategory(post.Categories[0].Title)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
