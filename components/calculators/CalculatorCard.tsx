import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export interface CalculatorCardProps {
  title: string;
  description: string;
  href: string;
  badge: string;
  features: string[];
  icon: React.ReactNode;
}

export function CalculatorCard({
  title,
  description,
  href,
  badge,
  features,
  icon,
}: CalculatorCardProps) {
  return (
    <Card variant="interactive" className="flex flex-col justify-between h-full group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <Badge variant="brand">{badge}</Badge>
        </div>

        <CardHeader className="px-0 pt-0">
          <CardTitle className="group-hover:text-brand-600 transition-colors">
            {title}
          </CardTitle>
          <CardDescription className="mt-2 text-surface-600">
            {description}
          </CardDescription>
        </CardHeader>

        <ul className="mt-4 space-y-2 text-xs text-surface-700">
          {features.map((feat, i) => (
            <li key={i} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <CardFooter className="px-0 pb-0">
        <Button href={href} variant="outline" size="sm" className="w-full justify-between">
          <span>Open Calculator</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </CardFooter>
    </Card>
  );
}
