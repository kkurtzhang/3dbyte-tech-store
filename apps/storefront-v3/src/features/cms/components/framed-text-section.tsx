import Image from "next/image";
import { WhyUsSection } from "@/lib/strapi/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FramedTextSectionProps {
  data: WhyUsSection;
}

export function FramedTextSection({ data }: FramedTextSectionProps) {
  if (!data.Tile || data.Tile.length === 0) {
    console.error("FramedTextSection: Missing Tile data", { data });
    return null;
  }

  return (
    <div className="py-12 space-y-8">
      <h2 className="text-3xl font-bold tracking-tight text-center">
        {data.Title}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.Tile.map((tile) => (
          <Card key={tile.id} className="bg-primary/5 border-none shadow-none">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background border shadow-sm">
                <div className="relative h-6 w-6">
                  <Image
                    src={tile.Image?.url || ""}
                    alt={tile.Image?.alternativeText || tile.Title}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <CardTitle className="text-xl">{tile.Title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{tile.Text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
