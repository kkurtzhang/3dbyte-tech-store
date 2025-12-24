import { useMemo } from 'react'
import Image from 'next/image'

import { cn } from '@lib/util/cn'
import { StoreCollection } from '@medusajs/types'
import { Box } from '@modules/common/components/box'
import { Button } from '@modules/common/components/button'
import { Container } from '@modules/common/components/container'
import { Heading } from '@modules/common/components/heading'
import LocalizedClientLink from '@modules/common/components/localized-client-link'
import { Text } from '@modules/common/components/text'
import { CollectionsData } from 'types/strapi'

const CollectionTile = ({
  title,
  handle,
  imgSrc,
  description,
  id,
}: {
  title: string
  handle: string
  imgSrc: string
  description: string
  id: number
}) => {
  return (
    <Box
      className={cn('group relative', {
        'sm:col-start-2 sm:row-start-1 sm:row-end-3': id === 2,
      })}
    >
      <Image
        src={imgSrc}
        alt={`${title} collection image`}
        width={600}
        height={300}
        loading="lazy"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="h-full w-full object-cover object-center"
      />
      <Box className="absolute left-0 top-0 hidden h-full w-full flex-col p-6 sm:flex lg:p-10">
        <Button
          asChild
          className="w-max self-end transition-all duration-500 ease-in-out lg:opacity-0 lg:group-hover:opacity-100"
        >
          <LocalizedClientLink href={`/collections/${handle}`}>
            Discover
          </LocalizedClientLink>
        </Button>
        <Box className="mt-auto text-static">
          <Heading as="h3" className="mt-auto text-2xl lg:text-3xl">
            {title}
          </Heading>
          <Text
            size="lg"
            className="line-clamp-2 transition-all duration-500 ease-in-out lg:h-0 lg:opacity-0 lg:group-hover:h-12 lg:group-hover:opacity-100"
          >
            {description}
          </Text>
        </Box>
      </Box>
      <Box className="absolute left-0 top-0 block h-full w-full p-6 sm:hidden lg:p-10">
        <LocalizedClientLink
          href={`/collections/${handle}`}
          className="flex h-full w-full flex-col justify-end"
        >
          <Heading as="h3" className="text-2xl text-static lg:text-3xl">
            {title}
          </Heading>
        </LocalizedClientLink>
      </Box>
    </Box>
  )
}

const Collections = ({
  cmsCollections,
  medusaCollections,
}: {
  cmsCollections: CollectionsData
  medusaCollections: StoreCollection[]
}) => {
  const validCollections = useMemo(() => {
    if (!cmsCollections.data.length || !medusaCollections.length) return null
    const collections = cmsCollections.data.filter((cmsCollection) =>
      medusaCollections.some(
        (medusaCollection) => medusaCollection.handle === cmsCollection.Handle
      )
    )
    if (!collections || collections.length < 3) return null
    return collections.sort((a, b) => b.id - a.id)
  }, [cmsCollections, medusaCollections])

  const newestCollections = useMemo(() => {
    if (!validCollections) return null
    return validCollections.slice(0, 3)
  }, [validCollections])

  if (!newestCollections) return null

  return (
    <Container className="grid max-h-[660px] grid-rows-3 gap-2 sm:max-h-[440px] sm:grid-cols-2 sm:grid-rows-2 lg:max-h-[660px]">
      {newestCollections.slice(0, 3).map((element, id) => (
        <CollectionTile
          key={id}
          title={element.Title}
          handle={element.Handle}
          imgSrc={element.Image.url}
          description={element.Description}
          id={id}
        />
      ))}
    </Container>
  )
}

export default Collections
