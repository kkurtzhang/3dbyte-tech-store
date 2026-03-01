import { NumericalContent } from "@/lib/strapi/types";

interface NumericalSectionProps {
  data: NumericalContent[];
}

export function NumericalSection({ data }: NumericalSectionProps) {
  return (
    <div className="py-12">
      <div className="grid gap-8 rounded-xl bg-secondary p-8 sm:grid-cols-2 lg:grid-cols-4 lg:p-12">
        {data.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center text-center space-y-2"
          >
            <span className="text-4xl font-bold tracking-tight font-mono text-primary">
              {item.Title}
            </span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {item.Text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
