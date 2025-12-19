import { Metadata } from 'next'

import { Button } from '@modules/common/components/button'
import { Container } from '@modules/common/components/container'
import { Heading } from '@modules/common/components/heading'
import LocalizedClientLink from '@modules/common/components/localized-client-link'
import { Text } from '@modules/common/components/text'

export const metadata: Metadata = {
  title: '404',
  description: 'Something went wrong',
}

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center justify-center gap-6">
      <Text className="text-5xl font-semibold small:text-4xl">404</Text>
      <Heading className="text-5xl small:text-4xl" as="h1">
        Page not found
      </Heading>
      <Text className="text-secondary" size="md">
        Sorry, we couldn’t find the page you’re looking for.
      </Text>
      <Button asChild>
        <LocalizedClientLink href="/">Go to homepage</LocalizedClientLink>
      </Button>
    </Container>
  )
}
