"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Ruler, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type SizeCategory = "clothing" | "shoes" | "accessories"

interface SizeChart {
  headers: string[]
  rows: {
    label: string
    values: string[]
  }[]
}

const sizeCharts: Record<string, Record<string, SizeChart>> = {
  clothing: {
    "tops-shirts": {
      headers: ["Size", "XS", "S", "M", "L", "XL", "XXL"],
      rows: [
        { label: "Chest (inches)", values: ["32-34", "34-36", "36-38", "38-40", "40-42", "42-44"] },
        { label: "Chest (cm)", values: ["81-86", "86-91", "91-97", "97-102", "102-107", "107-112"] },
        { label: "Length (inches)", values: ["26", "27", "28", "29", "30", "31"] },
        { label: "Length (cm)", values: ["66", "69", "71", "74", "76", "79"] },
      ],
    },
    "pants-shorts": {
      headers: ["Size", "XS", "S", "M", "L", "XL", "XXL"],
      rows: [
        { label: "Waist (inches)", values: ["26-28", "28-30", "30-32", "32-34", "34-36", "36-38"] },
        { label: "Waist (cm)", values: ["66-71", "71-76", "76-81", "81-86", "86-91", "91-97"] },
        { label: "Hip (inches)", values: ["34-36", "36-38", "38-40", "40-42", "42-44", "44-46"] },
        { label: "Hip (cm)", values: ["86-91", "91-97", "97-102", "102-107", "107-112", "112-117"] },
        { label: "Inseam (inches)", values: ["30", "31", "32", "32", "33", "33"] },
      ],
    },
    dresses: {
      headers: ["Size", "XS", "S", "M", "L", "XL", "XXL"],
      rows: [
        { label: "Bust (inches)", values: ["32-34", "34-36", "36-38", "38-40", "40-42", "42-44"] },
        { label: "Bust (cm)", values: ["81-86", "86-91", "91-97", "97-102", "102-107", "107-112"] },
        { label: "Waist (inches)", values: ["24-26", "26-28", "28-30", "30-32", "32-34", "34-36"] },
        { label: "Waist (cm)", values: ["61-66", "66-71", "71-76", "76-81", "81-86", "86-91"] },
        { label: "Hip (inches)", values: ["34-36", "36-38", "38-40", "40-42", "42-44", "44-46"] },
      ],
    },
    jackets: {
      headers: ["Size", "XS", "S", "M", "L", "XL", "XXL"],
      rows: [
        { label: "Chest (inches)", values: ["32-34", "34-36", "36-38", "38-40", "40-42", "42-44"] },
        { label: "Chest (cm)", values: ["81-86", "86-91", "91-97", "97-102", "102-107", "107-112"] },
        { label: "Shoulder (inches)", values: ["16", "17", "18", "19", "20", "21"] },
        { label: "Shoulder (cm)", values: ["41", "43", "46", "48", "51", "53"] },
        { label: "Length (inches)", values: ["24", "25", "26", "27", "28", "29"] },
      ],
    },
  },
  shoes: {
    "mens-shoes": {
      headers: ["Size (US)", "6", "7", "8", "9", "10", "11", "12", "13"],
      rows: [
        { label: "UK", values: ["5", "6", "7", "8", "9", "10", "11", "12"] },
        { label: "EU", values: ["39", "40", "41", "42", "43", "44", "45", "46"] },
        { label: "Length (cm)", values: ["24.5", "25.5", "26.5", "27.5", "28.5", "29.5", "30.5", "31.5"] },
      ],
    },
    "womens-shoes": {
      headers: ["Size (US)", "5", "6", "7", "8", "9", "10", "11"],
      rows: [
        { label: "UK", values: ["3", "4", "5", "6", "7", "8", "9"] },
        { label: "EU", values: ["36", "37", "38", "39", "40", "41", "42"] },
        { label: "Length (cm)", values: ["22", "23", "24", "25", "26", "27", "28"] },
      ],
    },
    "unisex-shoes": {
      headers: ["Size (US)", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"],
      rows: [
        { label: "UK", values: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
        { label: "EU", values: ["36", "37", "38", "39", "40", "42", "43", "44", "45", "47"] },
        { label: "Length (cm)", values: ["22", "23", "24", "25", "26", "27", "28", "29", "30", "31"] },
      ],
    },
  },
  accessories: {
    belts: {
      headers: ["Size", "S", "M", "L", "XL"],
      rows: [
        { label: "Waist (inches)", values: ["28-32", "32-36", "36-40", "40-44"] },
        { label: "Waist (cm)", values: ["71-81", "81-91", "91-102", "102-112"] },
        { label: "Total Length (inches)", values: ["44", "48", "52", "56"] },
      ],
    },
    hats: {
      headers: ["Size", "S", "M", "L", "XL"],
      rows: [
        { label: "Circumference (inches)", values: ["21-21.5", "21.5-22", "22-22.5", "22.5-23"] },
        { label: "Circumference (cm)", values: ["53-55", "55-56", "56-57", "57-58"] },
      ],
    },
    gloves: {
      headers: ["Size", "S", "M", "L", "XL"],
      rows: [
        { label: "Palm Circumference (inches)", values: ["7-7.5", "7.5-8", "8-8.5", "8.5-9"] },
        { label: "Palm Circumference (cm)", values: ["18-19", "19-20", "20-22", "22-23"] },
      ],
    },
  },
}

interface SizeGuideButtonProps {
  category?: SizeCategory
  productType?: string
  className?: string
}

export function SizeGuideButton({ category = "clothing", productType, className }: SizeGuideButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedChart, setSelectedChart] = useState<string>("tops-shirts")

  // Auto-detect the appropriate chart based on product type
  const detectChart = (type?: string): string => {
    if (!type) return "tops-shirts"
    
    const typeLower = type.toLowerCase()
    
    if (category === "shoes") {
      if (typeLower.includes("men") || typeLower.includes("male")) return "mens-shoes"
      if (typeLower.includes("women") || typeLower.includes("female")) return "womens-shoes"
      return "unisex-shoes"
    }
    
    if (category === "accessories") {
      if (typeLower.includes("belt")) return "belts"
      if (typeLower.includes("hat") || typeLower.includes("cap")) return "hats"
      if (typeLower.includes("glove")) return "gloves"
    }
    
    // Clothing defaults
    if (typeLower.includes("pant") || typeLower.includes("short") || typeLower.includes("jean")) return "pants-shorts"
    if (typeLower.includes("dress") || typeLower.includes("gown")) return "dresses"
    if (typeLower.includes("jacket") || typeLower.includes("coat") || typeLower.includes("blazer")) return "jackets"
    
    return "tops-shirts"
  }

  const currentChart = selectedChart && sizeCharts[category]?.[selectedChart] 
    ? sizeCharts[category][selectedChart] 
    : null

  const chartOptions = currentChart ? Object.keys(sizeCharts[category] || {}) : []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("gap-2 text-muted-foreground hover:text-foreground", className)}
        >
          <Ruler className="h-4 w-4" />
          Size Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Size Guide</DialogTitle>
          <DialogDescription>
            Find your perfect fit with our comprehensive size charts
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          defaultValue={detectChart(productType)} 
          onValueChange={setSelectedChart}
          className="w-full"
        >
          {/* Category Tabs */}
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="clothing">Clothing</TabsTrigger>
            <TabsTrigger value="shoes">Shoes</TabsTrigger>
            <TabsTrigger value="accessories">Accessories</TabsTrigger>
          </TabsList>

          {/* Clothing Charts */}
          <TabsContent value="clothing" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {["tops-shirts", "pants-shorts", "dresses", "jackets"].map((chart) => (
                <Button
                  key={chart}
                  variant={selectedChart === chart ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChart(chart)}
                  className="capitalize"
                >
                  {chart.replace("-", " ")}
                </Button>
              ))}
            </div>
            {renderSizeChart(sizeCharts.clothing[selectedChart] || sizeCharts.clothing["tops-shirts"])}
          </TabsContent>

          {/* Shoes Charts */}
          <TabsContent value="shoes" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {["mens-shoes", "womens-shoes", "unisex-shoes"].map((chart) => (
                <Button
                  key={chart}
                  variant={selectedChart === chart ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChart(chart)}
                  className="capitalize"
                >
                  {chart.replace("-", " ")}
                </Button>
              ))}
            </div>
            {renderSizeChart(sizeCharts.shoes[selectedChart] || sizeCharts.shoes["unisex-shoes"])}
          </TabsContent>

          {/* Accessories Charts */}
          <TabsContent value="accessories" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {["belts", "hats", "gloves"].map((chart) => (
                <Button
                  key={chart}
                  variant={selectedChart === chart ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChart(chart)}
                  className="capitalize"
                >
                  {chart}
                </Button>
              ))}
            </div>
            {renderSizeChart(sizeCharts.accessories[selectedChart] || sizeCharts.accessories["belts"])}
          </TabsContent>
        </Tabs>

        {/* Measurement Guide */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            How to Measure
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Chest/Bust:</strong> Measure around the fullest part</li>
            <li>• <strong>Waist:</strong> Measure around your natural waistline</li>
            <li>• <strong>Hip:</strong> Measure around the fullest part of your hips</li>
            <li>• <strong>Inseam:</strong> Measure from the crotch to the bottom of the leg</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function renderSizeChart(chart: SizeChart | null) {
  if (!chart) return null

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            {chart.headers.map((header, index) => (
              <th 
                key={index} 
                className={cn(
                  "px-4 py-3 text-left font-semibold",
                  index === 0 ? "w-32" : ""
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className={cn(
                "border-t",
                rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"
              )}
            >
              <td className="px-4 py-3 font-medium text-muted-foreground">
                {row.label}
              </td>
              {row.values.map((value, valueIndex) => (
                <td key={valueIndex} className="px-4 py-3">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Helper function to detect if a product should show size guide
export function shouldShowSizeGuide(product: { 
  collection?: { handle?: string; title?: string } | null
  type?: { value?: string } | null
  category?: { name?: string } | null
  tags?: Array<{ value?: string }> | null
}): { shouldShow: boolean; category: SizeCategory; productType?: string } {
  const collection = product.collection
  const type = product.type
  const category = product.category
  const tags = product.tags

  // Check collection handle/title
  const collectionCheck = (collection?.handle || collection?.title || "").toLowerCase()
  const categoryCheck = (category?.name || "").toLowerCase()
  const typeCheck = (type?.value || "").toLowerCase()
  const tagCheck = (tags || []).map(t => t.value || "").join(" ").toLowerCase()

  const searchText = `${collectionCheck} ${categoryCheck} ${typeCheck} ${tagCheck}`

  // Shoes detection
  if (
    searchText.includes("shoe") ||
    searchText.includes("sneaker") ||
    searchText.includes("boot") ||
    searchText.includes("sandal") ||
    searchText.includes("footwear")
  ) {
    return { shouldShow: true, category: "shoes", productType: type?.value }
  }

  // Accessories detection
  if (
    searchText.includes("belt") ||
    searchText.includes("hat") ||
    searchText.includes("cap") ||
    searchText.includes("glove") ||
    searchText.includes("watch") ||
    searchText.includes("jewelry")
  ) {
    return { shouldShow: true, category: "accessories", productType: type?.value }
  }

  // Clothing detection (default)
  if (
    searchText.includes("shirt") ||
    searchText.includes("top") ||
    searchText.includes("pant") ||
    searchText.includes("jean") ||
    searchText.includes("short") ||
    searchText.includes("dress") ||
    searchText.includes("jacket") ||
    searchText.includes("coat") ||
    searchText.includes("blazer") ||
    searchText.includes("sweater") ||
    searchText.includes("hoodie") ||
    searchText.includes("clothing") ||
    searchText.includes("apparel")
  ) {
    return { shouldShow: true, category: "clothing", productType: type?.value }
  }

  return { shouldShow: false, category: "clothing" }
}
