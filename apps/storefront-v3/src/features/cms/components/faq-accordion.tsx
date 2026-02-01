import { FAQSection } from "@/lib/strapi/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQAccordionProps {
  data: FAQSection;
}

export function FAQAccordion({ data }: FAQAccordionProps) {
  return (
    <div id={data.Bookmark} className="scroll-mt-24 space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">{data.Title}</h2>
      <Accordion type="single" collapsible className="w-full">
        {data.Question.map((item, index) => (
          <AccordionItem key={item.id} value={`item-${index}`}>
            <AccordionTrigger className="text-left font-medium text-lg">
              {item.Title}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {item.Text}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
