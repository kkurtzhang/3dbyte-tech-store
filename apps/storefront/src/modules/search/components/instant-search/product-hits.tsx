'use client'

import { InfiniteHits } from 'react-instantsearch'
import { ProductHitCard } from './product-hit-card'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'

/**
 * ProductHits - Right panel with infinite scroll product results.
 *
 * Uses InfiniteHits widget from react-instantsearch for:
 * - Infinite scroll pagination
 * - Custom hit component
 * - Loading states
 *
 * Design specifications:
 * - Background: White #FFFFFF
 * - Width: 65-70% of screen width
 * - Product cards with shadow on hover
 */
export function ProductHits() {
	return (
		<Box className="flex flex-col bg-white">
			<Box className="flex h-[62px] items-center justify-between px-6">
				<Text size="md" className="text-secondary">
					Products
				</Text>
			</Box>

			<InfiniteHits
				hitComponent={ProductHitCard}
				classNames={{
					list: 'flex flex-col gap-4 px-6 pb-6',
					item: 'w-full',
					loadMore: 'w-full text-center mt-6 px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors',
					disabledLoadMore: 'hidden',
				}}
				showPrevious={false}
			/>
		</Box>
	)
}
