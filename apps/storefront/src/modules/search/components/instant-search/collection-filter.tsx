'use client'

import { useRefinementList } from 'react-instantsearch'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'

/**
 * CollectionFilter section in the filter sidebar.
 *
 * Displays:
 * - Collection categories from Meilisearch facets
 * - Clickable text links (no checkboxes)
 * - Active collection shown in bold
 *
 * Design specifications:
 * - COLLECTIONS header in uppercase, light gray #666, 600 weight, 14px
 * - Items in black #333, 16px
 * - Top border to separate from SUGGESTIONS section
 * - Light gray sidebar background #f8f8f8
 */
export function CollectionFilter() {
	// Use InstantSearch's refinement list for filtering by collection_ids
	const { items, refine } = useRefinementList({
		attribute: 'collection_ids',
		limit: 10,
	})

	const hasCollections = items.length > 0

	return (
		<Box className="flex flex-col px-4 py-4 border-t border-[#e0e0e0]">
			{/* COLLECTIONS Header */}
			<Text className="text-xs font-semibold text-[#666] uppercase mb-4">
				Collections
			</Text>

			{/* Collection list - no checkboxes, just clickable links */}
			{hasCollections ? (
				<div className="flex flex-col gap-3">
					{items.map((item) => (
						<CollectionItem
							key={item.value}
							item={item}
							onClick={() => refine(item.value)}
						/>
					))}
				</div>
			) : (
				<Text className="text-sm text-gray-500 italic">
					No collections available
				</Text>
			)}
		</Box>
	)
}

/**
 * Individual collection item
 */
function CollectionItem({
	item,
	onClick,
}: {
	item: { label: string; value: string; isRefined: boolean; count?: number }
	onClick: () => void
}) {
	return (
		<button
			onClick={onClick}
			className={`
				px-0 py-2 text-left text-base transition-colors
				${item.isRefined
					? 'text-[#333] font-semibold'
					: 'text-[#333] font-normal hover:bg-gray-200/50'
				}
				rounded w-full
			`}
		>
			<div className="flex items-center justify-between">
				<span>{item.label || item.value}</span>
				{item.count !== undefined && (
					<Text size="sm" className="text-gray-500">
						{item.count}
					</Text>
				)}
			</div>
		</button>
	)
}
