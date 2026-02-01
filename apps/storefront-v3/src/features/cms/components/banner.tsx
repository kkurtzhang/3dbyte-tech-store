import Image from "next/image";
import { StrapiImage } from "@/lib/strapi/types";

interface BannerProps {
  data: StrapiImage[];
}

export function Banner({ data }: BannerProps) {
  if (!data || data.length === 0) return null;

  const background = data[0];
  const logo = data[1];

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-muted">
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9] lg:h-[400px]">
        <Image
          src={background.url}
          alt={background.alternativeText || "Banner image"}
          fill
          className="object-cover"
          priority
        />
        {logo && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="relative h-20 w-full max-w-[200px] sm:h-32 sm:max-w-[300px]">
              <Image
                src={logo.url}
                alt={logo.alternativeText || "Banner logo"}
                fill
                className="object-contain drop-shadow-xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
