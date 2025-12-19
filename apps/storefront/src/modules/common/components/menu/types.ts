export type MenuProps = {
  className?: string
  children: React.ReactNode | ((props: { open: boolean }) => React.ReactNode)
  disabled?: boolean
}

export type TriggerProps = {
  label: string
  helperText?: string
  icon?: React.ReactNode
  customArrow?: React.ReactNode
  menuId?: string
}

export type ContentProps = {
  position?: 'right' | 'left' | 'top' | 'bottom'
  menuId?: string
}
