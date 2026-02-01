import { cn } from "@/lib/utils";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";

interface MdxContentProps {
  content: string;
  className?: string;
}

export function MdxContent({ content, className }: MdxContentProps) {
  if (!content) return null;

  return (
    <div
      className={cn(
        "prose prose-zinc dark:prose-invert max-w-none",
        "prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-tight",
        "prose-h1:text-3xl prose-h1:font-bold",
        "prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2",
        "prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3",
        "prose-p:leading-7 prose-p:mb-6",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-ul:my-6 prose-ul:ml-6 prose-ul:list-disc",
        "prose-ol:my-6 prose-ol:ml-6 prose-ol:list-decimal",
        "prose-li:mb-2",
        "prose-code:rounded prose-code:bg-muted prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:text-foreground",
        "prose-pre:prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-4",
        "prose-blockquote:prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic",
        "prose-strong:prose-strong:text-foreground",
        className,
      )}
    >
      <MDXRemote
        source={content}
        options={{
          mdxOptions: {
            rehypePlugins: [rehypeHighlight],
            remarkPlugins: [remarkGfm],
          },
        }}
      />
    </div>
  );
}
