import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

type BrandLogoSize = "header" | "checkout" | "footer"

type BrandLogoProps = {
  className?: string
  href?: string
  mobileMark?: boolean
  priority?: boolean
  size?: BrandLogoSize
}

const sizeClassNames: Record<BrandLogoSize, string> = {
  header: "w-9 sm:w-[150px]",
  checkout: "w-[132px] sm:w-[150px]",
  footer: "w-[170px] sm:w-[190px]",
}

const horizontalImageSizes: Record<BrandLogoSize, string> = {
  header: "(min-width: 640px) 150px, 0px",
  checkout: "(min-width: 640px) 150px, 132px",
  footer: "(min-width: 640px) 190px, 170px",
}

export function BrandLogo({
  className,
  href = "/",
  mobileMark = false,
  priority = false,
  size = "header",
}: BrandLogoProps) {
  const content = (
    <>
      {mobileMark && (
        <span className="block sm:hidden">
          <Image
            src="/brand/logos/logo-icon-192x192.png"
            alt=""
            width={192}
            height={192}
            priority={priority}
            unoptimized
            className="block h-9 w-9 dark:hidden sm:hidden"
          />
          <Image
            src="/brand/logos/logo-icon-reversed-128x128.png"
            alt=""
            width={128}
            height={128}
            priority={priority}
            unoptimized
            className="hidden h-9 w-9 dark:block sm:hidden"
          />
        </span>
      )}
      <span className={cn("w-full", mobileMark ? "hidden sm:block" : "block")}>
        <Image
          src="/brand/logos/logo-primary-horizontal-640w.png"
          alt=""
          width={640}
          height={178}
          priority={priority}
          sizes={horizontalImageSizes[size]}
          unoptimized
          className="block h-auto w-full dark:hidden"
        />
        <Image
          src="/brand/logos/logo-primary-horizontal-reversed-640w.png"
          alt=""
          width={640}
          height={178}
          priority={priority}
          sizes={horizontalImageSizes[size]}
          unoptimized
          className="hidden h-auto w-full dark:block"
        />
      </span>
      <span className="sr-only">3D Byte Tech</span>
    </>
  )

  const rootClassName = cn(
    "inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    sizeClassNames[size],
    className
  )

  if (!href) {
    return (
      <span aria-label="3D Byte Tech" className={rootClassName}>
        {content}
      </span>
    )
  }

  return (
    <Link href={href} aria-label="3D Byte Tech" className={rootClassName}>
      {content}
    </Link>
  )
}
