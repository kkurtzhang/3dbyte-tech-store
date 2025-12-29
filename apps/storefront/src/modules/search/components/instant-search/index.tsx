'use client'

import React from 'react'
import { InstantSearch as InstantSearchBase } from 'react-instantsearch'
import { searchClient, PRODUCTS_INDEX } from '@lib/meilisearch/client'

/**
 * InstantSearch Wrapper Component
 *
 * Wraps the React InstantSearch library with our Meilisearch client.
 * Provides the search context to all child components.
 *
 * @example
 * ```tsx
 * <InstantSearch query="search term">
 *   <SearchBox />
 *   <Hits />
 * </InstantSearch>
 * ```
 */
type InstantSearchProps = {
	children: React.ReactNode
	query?: string
}

export function InstantSearch({ children, query }: InstantSearchProps) {
	return (
		<InstantSearchBase
			searchClient={searchClient}
			indexName={PRODUCTS_INDEX}
			// Add initial search state if query is provided
			initialUiState={{
				[PRODUCTS_INDEX]: {
					query: query || '',
				},
			}}
			// Configure stalled search delay for perceived performance
			stalledSearchDelay={500}
		>
			{children}
		</InstantSearchBase>
	)
}

// Export all instant-search components
export { InstantSearchDropdown } from './search-dropdown'
export { InstantSearchBox } from './search-box'
export { InstantSearchResults } from './results'
export { ProductHitCard, ProductHitCardWrapper } from './product-hit-card'
export { QuerySuggestions } from './query-suggestions'
export { CollectionFilter } from './collection-filter'
export { FilterSidebar } from './filter-sidebar'
export { ProductHits } from './product-hits'
export { NoResults } from './no-results'
