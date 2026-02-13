import { MDXRemote } from "next-mdx-remote/rsc";
import { components } from "./mdx-components";
import { stripFrontmatter } from "@/lib/mdx";

interface MDXProviderProps {
  content: string;
}

export function MDXProvider({ content }: MDXProviderProps) {
  return (
    <MDXRemote
      source={stripFrontmatter(content)}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [],
          rehypePlugins: [],
        },
      }}
    />
  );
}
