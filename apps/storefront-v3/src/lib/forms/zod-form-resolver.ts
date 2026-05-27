import { zodResolver } from "@hookform/resolvers/zod"
import type { FieldValues, Resolver } from "react-hook-form"
import type { z } from "zod"

type ZodResolverFactory = <TFieldValues extends FieldValues>(
  schema: z.ZodTypeAny
) => Resolver<TFieldValues>

const createResolver = zodResolver as unknown as ZodResolverFactory

export function zodFormResolver<TFieldValues extends FieldValues>(
  schema: z.ZodTypeAny
): Resolver<TFieldValues> {
  return createResolver<TFieldValues>(schema)
}
