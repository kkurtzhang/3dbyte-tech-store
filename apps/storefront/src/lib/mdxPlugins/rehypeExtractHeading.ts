import { hasProperty } from 'hast-util-has-property'
import { headingRank } from 'hast-util-heading-rank'
import { visit } from 'unist-util-visit'

export interface Heading {
  title: string
  id: string
}

export function rehypeExtractHeadings({
  headings,
}: {
  headings: Heading[]
  // deprecated package, use any for now
}): (tree: any) => void {
  return (tree) => {
    visit(tree, (node) => {
      if (hasProperty(node, 'id')) {
        if (headingRank(node) === 2 && node.children[0]?.type === 'text') {
          headings.push({
            title: node.children[0].value,
            id: node.properties.id.toString(),
          })
        }
      }
    })
  }
}
