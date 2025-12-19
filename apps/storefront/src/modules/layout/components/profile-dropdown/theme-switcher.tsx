import { Button } from '@modules/common/components/button'
import { MoonIcon, SunIcon } from '@modules/common/icons'
import { useTheme } from 'next-themes'

export function ThemeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <Button
      variant="text"
      onClick={() => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
      }}
      className="w-full justify-start rounded-none p-0 hover:bg-hover"
    >
      <div className="flex items-center gap-4 p-4 text-lg">
        {resolvedTheme === 'dark' ? (
          <>
            <SunIcon /> Switch to light mode
          </>
        ) : (
          <>
            <MoonIcon /> Switch to dark mode
          </>
        )}
      </div>
    </Button>
  )
}
