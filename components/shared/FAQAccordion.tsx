"use client";

import React, { useState } from "react";
import { FAQItem } from "../../types/common";
import { cn } from "../../lib/utils/cn";

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

export function FAQAccordion({ items, className }: FAQAccordionProps) {
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const toggle = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className={cn("divide-y divide-surface-200 border-y border-surface-200", className)}>
      {items.map((item, index) => {
        const isOpen = openIndices.includes(index);
        return (
          <div key={index} className="py-4">
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between text-left font-semibold text-surface-900 hover:text-brand-600 transition-colors focus:outline-none"
              aria-expanded={isOpen}
            >
              <span className="text-base sm:text-lg">{item.question}</span>
              <span className="ml-4 flex-shrink-0 text-surface-400">
                <svg
                  className={cn("w-5 h-5 transition-transform duration-200", isOpen && "rotate-180")}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="mt-3 text-sm sm:text-base text-surface-600 leading-relaxed pr-6 animate-in fade-in duration-150">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
