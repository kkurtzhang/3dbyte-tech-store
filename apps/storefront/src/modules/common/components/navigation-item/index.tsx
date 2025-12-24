import { ComponentProps, ReactNode } from 'react'

import { cn } from '@lib/util/cn'
import { Slot } from '@lib/util/slot'
import { cva, VariantProps } from 'cva'

const NavigationItemVariants = cva({
  base: 'hover:bg-fg-secondary-hover hover:text-action-primary-hover hover:scale-[1.02] active:scale-[1.01] transition-all duration-150 ease-out origin-left',
  variants: {
    variant: {
      primary: 'text-lg text-basic-primary',
      secondary: 'text-md text-secondary',
    },
    disabled: {
      true: 'pointer-events-none text-disabled',
    },
    active: {
      true: 'bg-fg-secondary-hover font-medium',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    active: false,
  },
})

interface NavigationItemProps
  extends ComponentProps<'a'>,
    VariantProps<typeof NavigationItemVariants> {
  asChild?: boolean
  className?: string
  children?: ReactNode
  active?: boolean
}

export function NavigationItem({
  className,
  children,
  asChild,
  disabled,
  variant,
  active,
  ...props
}: NavigationItemProps) {
  const Comp = asChild ? Slot : 'a'

  const disabledProps = disabled
    ? {
        'aria-disabled': true,
        tabIndex: -1,
      }
    : {}

  return (
    <Comp
      {...props}
      {...disabledProps}
      className={cn(NavigationItemVariants({ variant, disabled, active }), className)}
    >
      {children}
    </Comp>
  )
}

NavigationItem.displayName = 'NavigationItem'
