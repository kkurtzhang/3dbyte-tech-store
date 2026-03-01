import fs from "fs";
import path from "path";
import { glob } from "glob";

export interface MDXPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author?: string;
  tags?: string[];
  published?: boolean;
}

export interface MDXPostWithContent extends MDXPost {
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content/blog");

/**
 * Get all MDX blog posts
 */
export async function getMDXPosts(): Promise<MDXPost[]> {
  try {
    const files = await glob("**/*.mdx", { cwd: CONTENT_DIR });

    const posts: MDXPost[] = [];

    for (const file of files) {
      const filePath = path.join(CONTENT_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const frontmatter = parseFrontmatter(content);

      // Only include published posts
      if (frontmatter.published === false) {
        continue;
      }

      posts.push({
        slug: file.replace(/\.mdx$/, ""),
        title: frontmatter.title || "Untitled",
        excerpt: frontmatter.excerpt || "",
        date: frontmatter.date || new Date().toISOString(),
        author: frontmatter.author,
        tags: frontmatter.tags,
        published: frontmatter.published !== false,
      });
    }

    // Sort by date (newest first)
    return posts.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  } catch (error) {
    console.error("Failed to get MDX posts:", error);
    return [];
  }
}

/**
 * Get a single MDX post by slug
 */
export async function getMDXPost(
  slug: string,
): Promise<MDXPostWithContent | null> {
  try {
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const frontmatter = parseFrontmatter(content);

    // Skip if not published
    if (frontmatter.published === false) {
      return null;
    }

    return {
      slug,
      title: frontmatter.title || "Untitled",
      excerpt: frontmatter.excerpt || "",
      date: frontmatter.date || new Date().toISOString(),
      author: frontmatter.author,
      tags: frontmatter.tags,
      published: frontmatter.published !== false,
      content,
    };
  } catch (error) {
    console.error(`Failed to get MDX post ${slug}:`, error);
    return null;
  }
}

/**
 * Parse frontmatter from MDX content
 */
function parseFrontmatter(content: string): Record<string, any> {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {};
  }

  const frontmatterText = match[1];
  const frontmatter: Record<string, any> = {};

  const lines = frontmatterText.split("\n");
  for (const line of lines) {
    const [key, ...valueParts] = line.split(":");
    if (!key || valueParts.length === 0) continue;

    const value = valueParts.join(":").trim();
    const trimmedKey = key.trim();

    // Parse arrays (tags: [tag1, tag2])
    if (value.startsWith("[") && value.endsWith("]")) {
      frontmatter[trimmedKey] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/['"]/g, ""));
    }
    // Parse booleans
    else if (value === "true") {
      frontmatter[trimmedKey] = true;
    } else if (value === "false") {
      frontmatter[trimmedKey] = false;
    }
    // Parse strings
    else {
      frontmatter[trimmedKey] = value.replace(/^["']|["']$/g, "");
    }
  }

  return frontmatter;
}

/**
 * Remove frontmatter from MDX content
 */
export function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n/, "");
}
