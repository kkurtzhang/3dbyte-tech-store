import React, { useId } from 'react'

import { cn } from '@lib/util/cn'
import { composeEventHandlers } from '@lib/util/compose-event-handlers'
import { ChevronRightIcon } from '@modules/common/icons'
import { cva } from 'cva'

import Divider from '../divider'
import { Label } from '../label'
import { ContentProps, MenuProps, TriggerProps } from './types'

const MenuContext = React.createContext<{
  openMenuId: string | null
  setOpenMenuId: React.Dispatch<React.SetStateAction<string>>
  disabled?: boolean
  wasKeyboardTriggerOpenRef: React.MutableRefObject<boolean>
}>({
  openMenuId: null,
  setOpenMenuId: () => {},
  disabled: false,
  wasKeyboardTriggerOpenRef: React.createRef<boolean>(),
})

const useMenuContext = () => React.useContext(MenuContext)

export const MenuRoot = ({
  className,
  children,
  disabled,
  ...props
}: MenuProps) => {
  const ref = React.useRef<HTMLDivElement>(null)
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null)
  const wasKeyboardTriggerOpenRef = React.useRef(false)

  React.useEffect(() => {
    if (!openMenuId) wasKeyboardTriggerOpenRef.current = false
  }, [openMenuId])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <MenuContext.Provider
      value={{ openMenuId, setOpenMenuId, disabled, wasKeyboardTriggerOpenRef }}
    >
      <div
        ref={ref}
        className={cn('relative flex flex-col', className)}
        {...props}
      >
        {typeof children === 'function'
          ? children({ open: openMenuId !== null })
          : children}
      </div>
    </MenuContext.Provider>
  )
}
MenuRoot.displayName = 'MenuRoot'

/**
 * Used to represent a menu.
 */
export const Menu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const menuId = useId()

  return (
    <div ref={ref} role="menu" className={className} {...props}>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child as React.ReactElement<any>, { menuId })
      })}
    </div>
  )
})
Menu.displayName = 'Menu'

/**
 * The trigger that toggles the menu.
 */
export const MenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & TriggerProps
>(
  (
    { label, helperText, icon, customArrow, menuId, className, ...props },
    ref
  ) => {
    const { openMenuId, setOpenMenuId, disabled, wasKeyboardTriggerOpenRef } =
      useMenuContext()

    const [isFocused, setIsFocused] = React.useState(false)

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault()
          setOpenMenuId(openMenuId === menuId ? null : menuId)
          wasKeyboardTriggerOpenRef.current = true
          break
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault()
          setOpenMenuId(menuId)
          wasKeyboardTriggerOpenRef.current = true
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault()
          setOpenMenuId(null)
          break
      }
    }

    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="menu"
        aria-expanded={openMenuId === menuId}
        aria-controls={openMenuId ? menuId : undefined}
        data-highlighted={isFocused ? '' : undefined}
        data-state={openMenuId ? 'open' : 'closed'}
        data-disabled={disabled ? '' : undefined}
        onFocus={composeEventHandlers(props.onFocus, () => setIsFocused(true))}
        onBlur={composeEventHandlers(props.onBlur, () => setIsFocused(false))}
        onKeyDown={composeEventHandlers(props.onKeyDown, handleKeyDown)}
        className={cn(
          'flex h-full cursor-pointer gap-4 rounded-xl p-4 !ring-0 !ring-offset-0 transition-all duration-200 ease-in-out hover:bg-hover focus:bg-hover',
          {
            'pointer-events-none text-disabled hover:bg-transparent': disabled,
          },
          { 'bg-hover': openMenuId === menuId },
          className
        )}
        onClick={() => {
          setOpenMenuId(openMenuId === menuId ? null : menuId)
        }}
        {...props}
      >
        {icon && (
          <span className={cn({ 'self-center': !helperText })}>{icon}</span>
        )}
        <div className="flex w-full flex-col items-start justify-center">
          <Label size="lg" className={cn({ 'cursor-pointer': !disabled })}>
            {label}
          </Label>
          {helperText && (
            <span
              className={cn('text-md text-secondary', {
                'text-disabled': disabled,
              })}
            >
              {helperText}
            </span>
          )}
        </div>
        {!disabled &&
          (customArrow ?? (
            <ChevronRightIcon
              className="flex h-8 w-8 self-center"
              data-testId="chevron-right"
            />
          ))}
      </div>
    )
  }
)
MenuTrigger.displayName = 'MenuTrigger'

/**
 * The content of the menu.
 */

const positionVariants = cva({
  base: '',
  variants: {
    position: {
      top: 'bottom-full mb-6',
      bottom: 'top-full mt-6',
      left: 'right-full mr-6 top-0',
      right: 'left-full ml-6 top-0',
    },
  },
})

export const MenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ContentProps
>(({ className, position = 'right', children, menuId, ...props }, ref) => {
  const { openMenuId } = useMenuContext()

  if (openMenuId !== menuId) return null

  const componentVariants = cn(
    positionVariants({
      position: position as 'right' | 'left' | 'top' | 'bottom',
      ...props,
    }),
    className
  )

  return (
    <div
      ref={ref}
      className={cn('absolute z-50', componentVariants)}
      {...props}
    >
      {children}
    </div>
  )
})
MenuContent.displayName = 'MenuContent'

/**
 * Used to represent a list of menu items.
 */
export const MenuList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('relative w-full', className)} {...props}>
      {children}
    </div>
  )
})
MenuList.displayName = 'MenuList'

/**
 * Used to represent a menu item.
 */
export const MenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('w-max py-1.5', className)} {...props}>
      {children}
    </div>
  )
})
MenuItem.displayName = 'MenuItem'

/**
 * Used to label a group of menu items.
 */
export const MenuLabel: React.FC<
  React.ComponentPropsWithoutRef<typeof Label>
> = ({ className, children, ...props }) => {
  return (
    <Label size="lg" className={cn('py-2', className)} {...props}>
      {children}
    </Label>
  )
}
MenuLabel.displayName = 'MenuLabel'

/**
 * Used to separate groups of menu items.
 */
export const MenuSeparator: React.FC<
  React.ComponentPropsWithoutRef<typeof Divider>
> = ({ className, ...props }) => <Divider className={className} {...props} />
MenuSeparator.displayName = 'MenuSeparator'
