'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@lib/util/cn'
import { Box } from '@modules/common/components/box'
import { InstantSearch } from './index'
import { InstantSearchBox } from './search-box'
import { InstantSearchResults } from './results'

type InstantSearchDropdownProps = {
	/**
	 * Whether the dropdown is open
	 */
	isOpen: boolean
	/**
	 * Callback to set the dropdown open state
	 */
	setIsOpen: (value: boolean) => void
	/**
	 * Initial search query
	 */
	query?: string
}

/**
 * InstantSearchDropdown - Modern search dropdown with instant results.
 *
 * Features:
 * - Search-as-you-type with instant results
 * - Two-column layout: filter sidebar + product results
 * - Click outside to close
 * - Auto-focus on open
 *
 * Design specifications:
 * - White background with shadow
 * - Positioned below search input
 * - Smooth transitions
 */
export function InstantSearchDropdown({
	isOpen,
	setIsOpen,
	query = '',
}: InstantSearchDropdownProps) {
	const searchRef = useRef<HTMLDivElement>(null)
	const [localQuery, setLocalQuery] = useState(query)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchRef.current &&
				!searchRef.current.contains(event.target as Node)
			) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		} else {
			document.removeEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen, setIsOpen])

	// Update local query when prop changes
	useEffect(() => {
		setLocalQuery(query)
	}, [query])

	return (
		<div
			ref={searchRef}
			className="hidden w-full lg:absolute lg:left-1/2 lg:top-4 lg:z-30 lg:block lg:-translate-x-1/2"
		>
			<InstantSearch query={localQuery}>
				{/* Search Box */}
				<div className="relative mx-auto w-full bg-white lg:w-[500px] xl:w-[600px]">
					<InstantSearchBox
						placeholder="Search products..."
						autoFocus={isOpen}
					/>
				</div>

				{/* Results Dropdown */}
				<Box
					className={cn(
						'absolute left-1/2 top-full z-50 w-[95vw] max-w-[900px] -translate-x-1/2 translate-y-2 bg-white shadow-xl transition-all duration-300 lg:w-[500px] lg:max-w-none xl:w-[600px]',
						isOpen
							? 'pointer-events-auto opacity-100 visible'
							: 'pointer-events-none invisible opacity-0'
					)}
				>
					<div className="max-h-[500px] overflow-y-auto">
						<InstantSearchResults />
					</div>
				</Box>
			</InstantSearch>
		</div>
	)
}
