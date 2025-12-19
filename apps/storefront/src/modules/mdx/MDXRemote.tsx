'use client'

import React from 'react'

import { MDXProvider } from '@mdx-js/react'
import { MDXRemote as MDX } from 'next-mdx-remote'

import { mdxComponents } from './MDXComponents'

interface Heading {
  title: string
  id: string
}

interface MDXRemoteProps {
  source: {
    frontmatter: {
      headings?: Heading[]
    }
    compiledSource: string
    scope: Record<string, unknown>
  }
}

export function MDXRemote({ source }: MDXRemoteProps) {
  return (
    <MDXProvider>
      <MDX {...source} components={mdxComponents} />
    </MDXProvider>
  )
}
