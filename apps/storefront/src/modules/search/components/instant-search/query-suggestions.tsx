'use client'

import { useInstantSearch } from 'react-instantsearch'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'
import { SearchIcon } from '@modules/common/icons'

/**
 * QuerySuggestions section in the filter sidebar.
 *
 * Displays:
 * - Dynamic query suggestions derived from search results
 * - Recent searches from localStorage (if no query or results)
 *
 * Design specifications:
 * - SUGGESTIONS header in uppercase, light gray #666, 600 weight, 14px
 * - Items with gray icons (20px), black #333 text, 16px
 * - Light gray sidebar background #f8f8f8
 */
export function QuerySuggestions() {
	const { results } = useInstantSearch()

	// Generate query suggestions from hits (product titles)
	// Limit to 5 suggestions
	const suggestions = results?.hits
		?.slice(0, 5)
		.map((hit: any) => hit.title)
		.filter((title: string) => title) || []

	const hasSuggestions = suggestions.length > 0

	return (
		<Box className="flex flex-col px-4 py-4">
			{/* SUGGESTIONS Header */}
			<Text className="text-xs font-semibold text-[#666] uppercase mb-4">
				Suggestions
			</Text>

			{/* Query suggestions from Meilisearch */}
			{hasSuggestions ? (
				<div className="flex flex-col gap-3">
					{suggestions.map((suggestion: string, index: number) => (
						<SuggestionItem
							key={`${suggestion}-${index}`}
							suggestion={suggestion}
						/>
					))}
				</div>
			) : (
				<Text className="text-sm text-gray-500 italic">
					No suggestions available
				</Text>
			)}
		</Box>
	)
}

/**
 * Individual suggestion item with icon
 */
function SuggestionItem({ suggestion }: { suggestion: string }) {
	const { setUiState } = useInstantSearch()

	const handleClick = () => {
		setUiState((prev) => ({
			...prev,
			products: {
				...prev.products,
				query: suggestion,
			},
		}))
	}

	return (
		<button
			onClick={handleClick}
			className="flex items-center gap-3 px-0 py-2 text-left text-[#333] hover:bg-gray-200/50 rounded transition-colors w-full"
		>
			<SearchIcon className="w-5 h-5 text-[#999] flex-shrink-0" />
			<Text className="text-base font-normal">{suggestion}</Text>
		</button>
	)
}
