import Image from "next/image";
import { ContentSection } from "@/lib/strapi/types";
import { cn } from "@/lib/utils";

interface BasicContentSectionProps {
  data: ContentSection;
  reversed?: boolean;
}

export function BasicContentSection({
  data,
  reversed,
}: BasicContentSectionProps) {
  const imageUrl = data.Image?.url;

  if (!imageUrl) {
    console.error("BasicContentSection: Missing image data", { data });
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-8 py-12 lg:flex-row lg:items-center lg:gap-16",
        reversed && "lg:flex-row-reverse",
      )}
    >
      <div className="flex-1 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">{data.Title}</h2>
        <div className="text-lg text-muted-foreground leading-relaxed">
          {data.Text}
        </div>
      </div>
      <div className="flex-1">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted lg:aspect-[4/3]">
          <Image
            src={imageUrl}
            alt={data.Image?.alternativeText || data.Title}
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
