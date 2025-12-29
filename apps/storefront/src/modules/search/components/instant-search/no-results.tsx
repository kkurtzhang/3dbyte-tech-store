'use client'

import { useInstantSearch } from 'react-instantsearch'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'
import { SearchResultsIcon } from '@modules/common/icons'

/**
 * NoResults - Empty state component for search.
 *
 * Displays a helpful message when no products match the search query.
 */
export function NoResults() {
	const { indexUiState } = useInstantSearch()
	const query = indexUiState.query || ''

	return (
		<Box className="flex flex-col items-center justify-center py-16 px-6 bg-white">
			<SearchResultsIcon />
			<Box className="flex flex-col items-center gap-3 mt-6 text-center">
				<Text className="text-xl font-semibold text-gray-900">
					No results for &quot;{query}&quot;
				</Text>
				<Text className="text-base text-gray-500 max-w-md">
					Please try again using a different spelling or phrase
				</Text>
			</Box>
		</Box>
	)
}
