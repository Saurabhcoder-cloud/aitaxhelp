import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTranslations } from "next-intl";

export function FAQSection() {
  const t = useTranslations("faq");
  const items = t.raw("items") as { question: string; answer: string }[];
  return (
    <section id="faq" className="border-b border-border py-16">
      <div className="container space-y-6">
        <h2 className="section-title">{t("title")}</h2>
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
