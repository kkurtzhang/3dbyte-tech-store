import Link from 'next/link'

import { MDXComponents } from 'mdx/types'

export const mdxComponents: MDXComponents = {
  a: ({ children, ...props }) => {
    return (
      <a
        href={props.href}
        target="_blank"
        className="text-basic-primary"
        {...props}
      >
        {children}
      </a>
    )
  },

  // TODO: Add image styling
  //   img: ({ ...props }) => {
  //     return (
  //       <div>
  //       </div>
  //     )
  //   },

  h2: ({ children, id, ...props }) => {
    return (
      <h2
        className="mb-2 mt-6 w-full text-xl text-basic-primary small:mt-12 small:text-2xl"
        id={id}
        {...props}
      >
        <Link href={`#${id}`}>{children}</Link>
      </h2>
    )
  },
  h3: ({ children, ...props }) => {
    return (
      <h3
        className="w-full text-lg text-basic-primary small:text-xl"
        {...props}
      >
        {children}
      </h3>
    )
  },
  h4: ({ children, ...props }) => {
    return (
      <h4
        className="my-0.5 w-full text-md text-basic-primary small:text-lg"
        {...props}
      >
        {children}
      </h4>
    )
  },
  p: ({ children, ...props }) => {
    return (
      <p {...props} className="w-full text-md text-secondary">
        {children}
      </p>
    )
  },
  ul: ({ children, ...props }) => {
    return (
      <ul
        {...props}
        className="!mt-0 w-full list-outside list-disc pl-5 text-md text-secondary"
      >
        {children}
      </ul>
    )
  },
  ol: ({ children, ...props }) => {
    return (
      <ol
        {...props}
        className="w-full list-outside list-decimal text-md text-secondary"
      >
        {children}
      </ol>
    )
  },
  li: ({ children, ...props }) => {
    return (
      <li {...props} className="">
        {children}
      </li>
    )
  },
  strong: ({ children, ...props }) => {
    return (
      <strong className="font-semibold" {...props}>
        {children}
      </strong>
    )
  },
  pre: ({ children, ...props }) => {
    return <pre {...props}>{children}</pre>
  },
  // TODO: Add table styling
  //   table: ({ children }) => {
  //     return (
  //       <div>
  //         <table>
  //           {children}
  //         </table>
  //       </div>
  //     )
  //   },
  //   td: ({ children }) => {
  //     return <td>{children}</td>
  //   },
  //   th: ({ children }) => {
  //     return <th >{children}</th>
  //   },
}
