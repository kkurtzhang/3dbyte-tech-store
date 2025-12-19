'use client'

import { AppProgressBar } from 'next-nprogress-bar'

export function ProgressBar() {
  return (
    <AppProgressBar
      height="3px"
      color="rgb(108 108 108)"
      options={{ showSpinner: false }}
    />
  )
}
