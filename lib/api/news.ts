export interface NewsItem {
  date: string;
  title: string;
  summary: string;
}

export const mockedNews: NewsItem[] = [
  {
    date: "2024-12-01",
    title: "IRS updates standard mileage rates",
    summary: "Latest mileage deduction guidance for gig drivers and self-employed workers.",
  },
  {
    date: "2024-11-28",
    title: "State filing deadline adjustments",
    summary: "Several states announced deadline relief for disaster-impacted counties.",
  },
  {
    date: "2024-11-25",
    title: "Earned Income Credit table refreshed",
    summary: "Income thresholds updated for families and single filers for the new tax year.",
  },
  {
    date: "2024-11-20",
    title: "Marketplace health coverage reminders",
    summary: "Form 1095-A distribution timelines published for marketplace enrollees.",
  },
  {
    date: "2024-11-18",
    title: "IRS warns about new phishing trends",
    summary: "Security bulletin on avoiding scams targeting e-file credentials and refunds.",
  },
];
