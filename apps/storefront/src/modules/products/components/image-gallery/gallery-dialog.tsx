'use client'

import { useEffect, useState } from 'react'

import { clx } from '@medusajs/ui'
import { Box } from '@modules/common/components/box'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@modules/common/components/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import useEmblaCarousel from 'embla-carousel-react'

import { LoadingImage } from '../product-tile/loading-image'

type GalleryDialogProps = {
  images: { id: string; url: string }[]
  title: string
  onChange: (index: number | null) => void
  activeImg: number
}

export const GalleryDialog = ({
  images,
  title,
  onChange,
  activeImg,
}: GalleryDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 900)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const [emblaRef] = useEmblaCarousel({
    skipSnaps: false,
    align: 'start',
    loop: false,
    axis: isLargeScreen ? 'y' : 'x',
  })

  useEffect(() => {
    if (activeImg !== null) {
      setCurrentIndex(activeImg)
    }
  }, [activeImg])

  return (
    !!images.length && (
      <Dialog onOpenChange={() => onChange(null)} open={activeImg !== null}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent aria-describedby={undefined}>
            <DialogHeader className="flex items-center text-xl text-basic-primary sm:hidden">
              {title}
              <DialogClose className="right-4" />
            </DialogHeader>
            <VisuallyHidden.Root>
              <DialogTitle>Product Gallery Modal</DialogTitle>
            </VisuallyHidden.Root>
            <DialogBody className="mx-auto flex max-w-[1440px] flex-col items-center justify-center gap-4 p-4 sm:gap-20 sm:px-14 sm:py-[31px] lg:flex-row lg:justify-normal">
              <div
                ref={images.length < 4 ? null : emblaRef}
                className="order-2 w-full select-none overflow-hidden sm:max-w-[549px] lg:order-1 lg:h-[429px] lg:w-auto"
              >
                <div
                  className={clx(
                    'flex flex-row gap-2 lg:h-full lg:flex-col'
                  )}
                >
                  {images.map((img, id) => (
                    <div
                      key={id}
                      className={clx(
                        'h-[92px] w-20 shrink-0 cursor-pointer border',
                        {
                          'border-black': currentIndex === id,
                        }
                      )}
                      onClick={() => {
                        setCurrentIndex(id)
                      }}
                    >
                      <LoadingImage
                        src={img.url}
                        alt={
                          title ? `${title} - product image` : 'Product image'
                        }
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Box className="relative order-1 mx-auto flex h-full max-h-[458px] w-full items-center sm:max-h-[758px] sm:max-w-[549px] lg:order-2 lg:-translate-x-20 xl:max-w-[660px] 2xl:max-h-[1137px] 2xl:max-w-[990px]">
                <LoadingImage
                  src={images[currentIndex].url}
                  alt={title ? `${title} - product image` : 'Product image'}
                  className="object-cover object-center"
                />
              </Box>
            </DialogBody>
            <DialogClose className="right-14 top-[31px] hidden sm:block" />
          </DialogContent>
        </DialogPortal>
      </Dialog>
    )
  )
}
