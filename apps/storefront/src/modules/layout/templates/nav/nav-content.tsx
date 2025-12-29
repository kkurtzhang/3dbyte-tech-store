'use client'

import { useState } from 'react'

import { cn } from '@lib/util/cn'
import { Box } from '@modules/common/components/box'
import { Button } from '@modules/common/components/button'
import LocalizedClientLink from '@modules/common/components/localized-client-link'
import { SearchIcon, SolaceLogo } from '@modules/common/icons'
import SideMenu from '@modules/layout/components/side-menu'
import { InstantSearchDropdown } from '@modules/search/components/instant-search'

import Navigation from './navigation'

export default function NavContent(props: any) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <>
      <Box className="flex lg:hidden">
        <SideMenu
          productCategories={props.productCategories}
          collections={props.collections}
          strapiCollections={props.strapiCollections}
        />
      </Box>
      {!isSearchOpen && (
        <Navigation
          countryCode={props.countryCode}
          productCategories={props.productCategories}
          collections={props.collections}
          strapiCollections={props.strapiCollections}
        />
      )}
      {isSearchOpen && (
        <InstantSearchDropdown
          setIsOpen={setIsSearchOpen}
          isOpen={isSearchOpen}
        />
      )}
      <Box
        className={cn('relative block', {
          'lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2':
            !isSearchOpen,
          'right-0 z-40': isSearchOpen,
        })}
      >
        <LocalizedClientLink href="/">
          <SolaceLogo className="h-6 medium:h-7" />
        </LocalizedClientLink>
      </Box>
      {!isSearchOpen && (
        <Button
          variant="icon"
          withIcon
          className="ml-auto h-auto !p-2 xsmall:!p-3.5"
          onClick={() => setIsSearchOpen(true)}
          data-testid="search-button"
        >
          <SearchIcon />
        </Button>
      )}
    </>
  )
}
