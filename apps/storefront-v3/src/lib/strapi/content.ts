import { strapiClient } from "./client"
import qs from "qs"

export async function getStrapiContent<T = any>(
  collectionType: string,
  params: Record<string, any> = {}
) {
  const query = qs.stringify(
    {
      populate: "*",
      ...params,
    },
    {
      encodeValuesOnly: true,
    }
  )

  return strapiClient.fetch<T>(`/${collectionType}?${query}`)
}

export interface RichTextContent {
  id: number
  attributes: {
    rich_text: string
    medusa_id: string
    createdAt: string
    updatedAt: string
  }
}
