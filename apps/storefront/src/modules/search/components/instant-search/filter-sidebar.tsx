'use client'

import { Box } from '@modules/common/components/box'
import { QuerySuggestions } from './query-suggestions'
import { CollectionFilter } from './collection-filter'

/**
 * FilterSidebar - Left sidebar container with two sections.
 *
 * Contains:
 * - SUGGESTIONS: Dynamic query suggestions from search results
 * - COLLECTIONS: Static collection categories for filtering
 *
 * Design specifications:
 * - Background: Light gray #f8f8f8
 * - Width: 30-35% of screen width
 * - Border: Thin light gray border #e0e0e0 separating from right content
 */
export function FilterSidebar() {
	return (
		<Box className="flex flex-col bg-[#f8f8f8] border-r border-[#e0e0e0] min-h-[400px]">
			{/* SUGGESTIONS Section */}
			<QuerySuggestions />

			{/* COLLECTIONS Section */}
			<CollectionFilter />
		</Box>
	)
}
