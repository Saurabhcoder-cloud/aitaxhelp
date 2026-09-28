export interface ReportEvent {
  id: string;
  calculationId: string;
  userId?: string;
  taxYear: number;
  calculatorType: string;
  accessTier: string;
  createdAt: string;
}

export interface ReportMetrics {
  reportsGenerated: number;
  taxYearDistribution: Record<number, number>;
  reportTypes: Record<string, number>;
  accessTierDistribution: Record<string, number>;
  recentReports: ReportEvent[];
}

declare global {
  // eslint-disable-next-line no-var
  var __reportEventsStore: ReportEvent[] | undefined;
}

function getMemoryStore(): ReportEvent[] {
  if (!globalThis.__reportEventsStore) {
    globalThis.__reportEventsStore = [];
  }
  return globalThis.__reportEventsStore;
}

export class TaxReportAnalyticsStore {
  /**
   * Records a tax report generation or print/export event.
   */
  public static async recordEvent(
    data: Omit<ReportEvent, "id" | "createdAt">
  ): Promise<ReportEvent> {
    const store = getMemoryStore();
    const event: ReportEvent = {
      id: crypto.randomUUID(),
      calculationId: data.calculationId,
      userId: data.userId,
      taxYear: data.taxYear,
      calculatorType: data.calculatorType,
      accessTier: data.accessTier,
      createdAt: new Date().toISOString(),
    };
    store.push(event);
    return event;
  }

  /**
   * Retrieves operational report metrics without fabricating fake numbers.
   */
  public static async getReportMetrics(): Promise<ReportMetrics> {
    const store = getMemoryStore();
    const reportsGenerated = store.length;

    const taxYearDistribution: Record<number, number> = {};
    const reportTypes: Record<string, number> = {};
    const accessTierDistribution: Record<string, number> = {};

    for (const event of store) {
      taxYearDistribution[event.taxYear] = (taxYearDistribution[event.taxYear] || 0) + 1;
      reportTypes[event.calculatorType] = (reportTypes[event.calculatorType] || 0) + 1;
      accessTierDistribution[event.accessTier] = (accessTierDistribution[event.accessTier] || 0) + 1;
    }

    const recentReports = [...store]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      reportsGenerated,
      taxYearDistribution,
      reportTypes,
      accessTierDistribution,
      recentReports,
    };
  }

  public static clear(): void {
    if (globalThis.__reportEventsStore) {
      globalThis.__reportEventsStore = [];
    }
  }
}
