'use server'

import {
  Heading,
  rehypeExtractHeadings,
} from '@lib/mdxPlugins/rehypeExtractHeading'
import { serialize } from 'next-mdx-remote/serialize'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import remarkUnwrapImages from 'remark-unwrap-images'

export const serializeMdx = async (content: string) => {
  let headings: Heading[] = []
  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkUnwrapImages, remarkGfm],

      rehypePlugins: [
        //@ts-ignore
        () => rehypeHighlight({ detect: true }),
        [rehypeSlug],
        [rehypeExtractHeadings, { headings }],
      ],
    },
  })

  return { ...mdxSource, frontmatter: { ...mdxSource.frontmatter, headings } }
}
