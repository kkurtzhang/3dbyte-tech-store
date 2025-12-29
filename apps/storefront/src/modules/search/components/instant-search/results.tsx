'use client'

import { useHits } from 'react-instantsearch'
import { FilterSidebar } from './filter-sidebar'
import { ProductHits } from './product-hits'
import { NoResults } from './no-results'

type InstantSearchResultsProps = {
	/**
	 * Optional initial query to pre-populate the search
	 */
	query?: string
}

/**
 * InstantSearchResults - Main container for instant search results.
 *
 * Features:
 * - Two-column layout: filter sidebar (left) + product results (right)
 * - Conditional rendering: shows results when available, no results when empty
 * - Responsive: single column on mobile, two-column on desktop
 *
 * @example
 * ```tsx
 * <InstantSearch query="shirt">
 *   <InstantSearchResults />
 * </InstantSearch>
 * ```
 */
export function InstantSearchResults({ query }: InstantSearchResultsProps) {
	return (
		<div className="w-full">
			<InstantSearchResultsContent />
		</div>
	)
}

/**
 * Internal content component that uses InstantSearch hooks
 */
function InstantSearchResultsContent() {
	const { hits } = useHits()

	if (hits.length === 0) {
		return <NoResults />
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-0">
			<FilterSidebar />
			<ProductHits />
		</div>
	)
}
