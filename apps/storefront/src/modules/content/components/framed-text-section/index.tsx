import Image from 'next/image'

import { Box } from '@modules/common/components/box'
import { Container } from '@modules/common/components/container'
import { Heading } from '@modules/common/components/heading'
import { Text } from '@modules/common/components/text'
import { WhyUsAttributes } from 'types/strapi'

export const FramedTextSection = ({ data }: { data: WhyUsAttributes }) => {
  const { Title: title, Tile: tileData } = data
  return (
    <Container className="bg-secondary text-basic-primary">
      <Heading className="mb-12 text-2xl small:text-3xl">{title}</Heading>
      <Box className="grid gap-4 small:grid-cols-2 small:gap-2 xl:grid-cols-4">
        {tileData.map((tile, id) => (
          <Box
            className="flex flex-col gap-6 bg-primary px-5 pb-5 pt-5 small:pt-[74px] xl:pt-[148px]"
            key={`Tile ${id}`}
          >
            <Box className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Image
                className="dark:invert"
                src={tile.Image.url}
                height={24}
                width={24}
                alt={tile.Image.alternativeText ?? `Tile icon ${id}`}
              />
            </Box>
            <Box>
              <Heading as="h3" className="mb-2 text-xl small:text-2xl">
                {tile.Title}
              </Heading>
              <Text className="text-secondary" size="lg">
                {tile.Text}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Container>
  )
}
