import { Metadata } from "next"
import { CompareClient } from "./compare-client"

export const metadata: Metadata = {
  title: "Compare Products | 3D Byte Store",
  description: "Compare specifications and features of selected products",
}

export default function ComparePage() {
  return <CompareClient />
}
