'use client'

import { SearchBox as AlgoliaSearchBox } from 'react-instantsearch'
import { cn } from '@lib/util/cn'

type InstantSearchBoxProps = {
	/**
	 * Additional CSS classes for the form container
	 */
	className?: string
	/**
	 * Placeholder text for the search input
	 */
	placeholder?: string
	/**
	 * Auto-focus the input on mount
	 */
	autoFocus?: boolean
}

/**
 * InstantSearchBox - Search input component using InstantSearch.
 *
 * Features:
 * - Debounced search (handled by InstantSearch)
 * - Clear button when text is present
 * - Keyboard navigation support
 *
 * Design specifications:
 * - Background: White #FFFFFF
 * - Border: Light gray #DEE2E6
 * - Padding: 16px horizontal, 12px vertical
 * - Clear button appears when text present
 */
export function InstantSearchBox({
	className,
	placeholder = 'Search products...',
	autoFocus = false,
}: InstantSearchBoxProps) {
	return (
		<AlgoliaSearchBox
			classNames={{
				form: cn(
					'relative w-full',
					className
				),
				input: 'w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
				submit: 'hidden',
				reset: 'absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1',
				loadingIndicator: 'absolute right-12 top-1/2 -translate-y-1/2',
			}}
			placeholder={placeholder}
			autoFocus={autoFocus}
		/>
	)
}
