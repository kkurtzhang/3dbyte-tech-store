import { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getRegion } from '@lib/data/regions'
import WishlistTemplate from '@modules/wishlist/templates'

type Props = {
  params: Promise<{ countryCode: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  return {
    title: `Wishlist | Solace Medusa Starter`,
    description: 'Your wishlist',
  }
}

export default async function WishlistPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  return (
    <WishlistTemplate
      region={region}
      countryCode={params.countryCode}
    />
  )
}
