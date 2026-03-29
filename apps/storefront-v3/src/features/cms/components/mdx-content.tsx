import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";

interface MdxContentProps {
  content: string;
  className?: string;
}

function createHeading(
  tag: "h1" | "h2" | "h3",
  className: string
) {
  return function Heading({
    children,
    ...props
  }: ComponentPropsWithoutRef<typeof tag>) {
    const Tag = tag;

    return (
      <Tag className={cn(className, props.className)} {...props}>
        {children}
      </Tag>
    );
  };
}

function Paragraph({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "mb-6 text-base leading-7 text-foreground/85 md:text-[1.05rem]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

function UnorderedList({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className={cn(
        "my-6 ml-6 list-disc space-y-3 pl-1 marker:text-primary [&_ol]:mt-3 [&_ul]:mt-3",
        className
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

function OrderedList({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className={cn(
        "my-6 ml-6 list-decimal space-y-3 pl-1 marker:font-semibold marker:text-primary [&_ol]:mt-3 [&_ul]:mt-3",
        className
      )}
      {...props}
    >
      {children}
    </ol>
  );
}

function ListItem({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"li">) {
  return (
    <li
      className={cn(
        "pl-1 text-base leading-7 text-foreground/85 [&>p]:mb-0 [&>ol]:mt-3 [&>ul]:mt-3",
        className
      )}
      {...props}
    >
      {children}
    </li>
  );
}

function Anchor({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      className={cn(
        "break-words font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

function Strong({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"strong">) {
  return (
    <strong className={cn("font-semibold text-foreground", className)} {...props}>
      {children}
    </strong>
  );
}

function Emphasis({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"em">) {
  return (
    <em className={cn("text-muted-foreground", className)} {...props}>
      {children}
    </em>
  );
}

function Table({ children, className, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-8 overflow-x-auto rounded-2xl border border-border/70 bg-card/40 shadow-sm">
      <table
        className={cn("w-full border-collapse text-sm md:text-base", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

function TableHead({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead className={cn("bg-muted/50", className)} {...props}>
      {children}
    </thead>
  );
}

function TableRow({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr className={cn("border-b border-border/70 last:border-b-0", className)} {...props}>
      {children}
    </tr>
  );
}

function TableHeader({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left font-semibold text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn("px-4 py-3 align-top text-foreground/85", className)}
      {...props}
    >
      {children}
    </td>
  );
}

function Blockquote({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      className={cn(
        "my-6 rounded-r-2xl border-l-4 border-primary/70 bg-muted/30 py-3 pl-4 pr-4 italic text-foreground/80",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
}

function InlineCode({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"code">) {
  if (className?.includes("language-")) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <code
      className={cn(
        "rounded bg-muted px-[0.35rem] py-[0.2rem] font-mono text-[0.9em] text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
}

function Preformatted({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      className={cn(
        "my-6 overflow-x-auto rounded-2xl border border-border/60 bg-muted p-4 text-sm shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  );
}

const mdxComponents = {
  h1: createHeading(
    "h1",
    "mt-0 scroll-mt-24 text-3xl font-bold tracking-tight text-foreground md:text-4xl"
  ),
  h2: createHeading(
    "h2",
    "mt-12 scroll-mt-24 border-b border-border pb-3 text-2xl font-semibold tracking-tight text-foreground md:text-[1.9rem]"
  ),
  h3: createHeading(
    "h3",
    "mt-10 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground md:text-[1.35rem]"
  ),
  p: Paragraph,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  a: Anchor,
  strong: Strong,
  em: Emphasis,
  table: Table,
  thead: TableHead,
  tr: TableRow,
  th: TableHeader,
  td: TableCell,
  blockquote: Blockquote,
  code: InlineCode,
  pre: Preformatted,
  hr: (props: ComponentPropsWithoutRef<"hr">) => (
    <hr className="my-8 border-border" {...props} />
  ),
  br: () => <br />,
} satisfies Record<string, (props: { children?: ReactNode }) => JSX.Element>;

export function MdxContent({ content, className }: MdxContentProps) {
  if (!content) return null;

  return (
    <div
      className={cn(
        "max-w-none text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
    >
      <MDXRemote
        components={mdxComponents}
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
