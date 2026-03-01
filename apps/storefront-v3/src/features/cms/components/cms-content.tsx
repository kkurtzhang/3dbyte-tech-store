import { cn } from "@/lib/utils";

interface CmsContentProps {
  content: string;
  className?: string;
}

export function CmsContent({ content, className }: CmsContentProps) {
  if (!content) return null;

  return (
    <div
      className={cn(
        "prose prose-zinc dark:prose-invert max-w-none",
        "prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-tight",
        "prose-h1:text-3xl prose-h1:font-bold",
        "prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2",
        "prose-p:leading-7 prose-p:mb-6",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-ul:my-6 prose-ul:ml-6 prose-ul:list-disc",
        "prose-code:rounded prose-code:bg-muted prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
