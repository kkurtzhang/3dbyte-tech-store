"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"

export interface PriceRangeSliderProps {
  min: number
  max: number
  currentMin: number
  currentMax: number
  onApply: (min: number, max: number) => void
  onClear: () => void
}

export function PriceRangeSlider({
  min,
  max,
  currentMin,
  currentMax,
  onApply,
  onClear,
}: PriceRangeSliderProps) {
  const [localMin, setLocalMin] = useState(currentMin)
  const [localMax, setLocalMax] = useState(currentMax)

  // Sync local state when current props change
  useEffect(() => {
    setLocalMin(currentMin)
    setLocalMax(currentMax)
  }, [currentMin, currentMax])

  const priceHasChanged = localMin !== currentMin || localMax !== currentMax

  const handleApply = () => {
    onApply(localMin, localMax)
  }

  const handleClear = () => {
    setLocalMin(min)
    setLocalMax(max)
    onClear()
  }

  return (
    <div className="space-y-4">
      <div className="px-2 py-3">
        <Slider
          min={min}
          max={max}
          step={10}
          value={[localMin, localMax]}
          onValueChange={([newMin, newMax]) => {
            setLocalMin(newMin)
            setLocalMax(newMax)
          }}
          className="w-full"
        />
      </div>
      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
        <span>${localMin}</span>
        <span>${localMax}</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="flex-1 h-8 text-xs"
          disabled={localMin === min && localMax === max}
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          className="flex-1 h-8 text-xs"
          disabled={!priceHasChanged}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
