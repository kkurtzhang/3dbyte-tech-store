'use client'

import type { MeilisearchProductDocument } from '@3dbyte-tech-store/shared-types'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'
import Thumbnail from '@modules/products/components/thumbnail'
import LocalizedClientLink from '@modules/common/components/localized-client-link'

type ProductHitCardProps = {
	hit: MeilisearchProductDocument
}

/**
 * ProductHitCard displays a single product result in the search.
 *
 * Matches the demo design with:
 * - 80x80px thumbnail
 * - Horizontal card layout
 * - White background with shadow on hover
 * - Product title, subtitle, and price
 */
export function ProductHitCard({ hit }: ProductHitCardProps) {
	return (
		<LocalizedClientLink href={`/products/${hit.handle}`}>
			<Box className="flex bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
				{/* Thumbnail */}
				<div className="flex-shrink-0 w-20 h-20">
					<Thumbnail
						thumbnail={hit.thumbnail}
						size="square"
						data-testid="product-hit-thumbnail"
					/>
				</div>

				{/* Content */}
				<div className="flex-grow ml-4 flex flex-col justify-between">
					<div>
						<Text className="font-semibold text-base text-gray-900">
							{hit.title}
						</Text>
						{hit.subtitle && (
							<Text size="sm" className="text-gray-500 mt-1">
								{hit.subtitle}
							</Text>
						)}
					</div>

					<Text className="font-bold text-sm text-gray-700">
						{hit.price.toFixed(2)} {hit.currency_code}
					</Text>
				</div>
			</Box>
		</LocalizedClientLink>
	)
}

/**
 * Wrapper component for use with InfiniteHits widget
 * The widget passes the hit as a prop
 */
export function ProductHitCardWrapper({ hit }: { hit: MeilisearchProductDocument }) {
	return <ProductHitCard hit={hit} />
}
