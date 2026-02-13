import type { MDXComponents } from "mdx/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Code, Terminal, FileCode, ExternalLink } from "lucide-react";

export const components: MDXComponents = {
  // Headings
  h1: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <h1
        className="text-3xl font-bold font-mono uppercase tracking-tight mb-4"
        {...restProps}
      >
        {children}
      </h1>
    );
  },
  h2: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <h2
        className="text-2xl font-semibold font-mono uppercase tracking-tight mt-10 mb-4 pb-2 border-b"
        {...restProps}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <h3
        className="text-xl font-semibold font-mono uppercase tracking-tight mt-8 mb-3"
        {...restProps}
      >
        {children}
      </h3>
    );
  },
  h4: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <h4
        className="text-lg font-semibold font-mono uppercase tracking-tight mt-6 mb-2"
        {...restProps}
      >
        {children}
      </h4>
    );
  },

  // Paragraphs
  p: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <p className="leading-7 mb-6 text-foreground" {...restProps}>
        {children}
      </p>
    );
  },

  // Links
  a: ({ href, children, ...props }) => {
    const { ref, ...restProps } = props as any;
    const isExternal = href?.startsWith("http");
    return (
      <a
        href={href}
        className={cn(
          "text-primary hover:underline underline-offset-4",
          isExternal && "inline-flex items-center gap-1",
        )}
        {...restProps}
      >
        {children}
        {isExternal && <ExternalLink className="h-3 w-3" />}
      </a>
    );
  },

  // Lists
  ul: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <ul className="my-6 ml-6 list-disc space-y-2" {...restProps}>
        {children}
      </ul>
    );
  },
  ol: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <ol className="my-6 ml-6 list-decimal space-y-2" {...restProps}>
        {children}
      </ol>
    );
  },
  li: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <li className="leading-7" {...restProps}>
        {children}
      </li>
    );
  },

  // Code blocks
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    const { ref, ...restProps } = props as any;
    return isInline ? (
      <code
        className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm text-foreground"
        {...restProps}
      >
        {children}
      </code>
    ) : (
      <code
        className={cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
          className,
        )}
        {...restProps}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <pre
        className="mb-6 mt-6 overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm"
        {...restProps}
      >
        {children}
      </pre>
    );
  },

  // Blockquotes
  blockquote: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <blockquote
        className="mb-6 mt-6 border-l-4 border-primary pl-4 italic text-muted-foreground"
        {...restProps}
      >
        {children}
      </blockquote>
    );
  },

  // Horizontal rule
  hr: ({ ...props }) => {
    const { ref, ...restProps } = props as any;
    return <hr className="my-8 border-border" {...restProps} />;
  },

  // Tables
  table: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <div className="my-6 w-full overflow-y-auto">
        <table
          className="w-full caption-bottom text-sm border-collapse border border-border"
          {...restProps}
        >
          {children}
        </table>
      </div>
    );
  },
  thead: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <thead className="[&_tr]:border-b [&_tr]:border-border" {...restProps}>
        {children}
      </thead>
    );
  },
  tbody: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <tbody className="[&_tr:last-child]:border-0" {...restProps}>
        {children}
      </tbody>
    );
  },
  tr: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <tr className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted" {...restProps}>
        {children}
      </tr>
    );
  },
  th: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" {...restProps}>
        {children}
      </th>
    );
  },
  td: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0" {...restProps}>
        {children}
      </td>
    );
  },

  // Images
  img: ({ src, alt, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <img
        src={src}
        alt={alt}
        className="my-6 rounded-lg border"
        {...restProps}
      />
    );
  },

  // Strong
  strong: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <strong className="font-semibold text-foreground" {...restProps}>
        {children}
      </strong>
    );
  },

  // Emphasis
  em: ({ children, ...props }) => {
    const { ref, ...restProps } = props as any;
    return (
      <em className="italic" {...restProps}>
        {children}
      </em>
    );
  },
};
