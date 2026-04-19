"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

export const AnalyticsClient = dynamic(
  () =>
    import("@/components/dashboard/AnalyticsClient").then((m) => ({ default: m.AnalyticsClient })),
  { loading: () => <Skeleton variant="chart" className="h-64 w-full" />, ssr: false }
);

export const AdCreativeReportTable = dynamic(
  () =>
    import("@/components/dashboard/AdCreativeReportTable").then((m) => ({
      default: m.AdCreativeReportTable,
    })),
  { loading: () => <Skeleton variant="card" className="h-48 w-full" />, ssr: false }
);

export const AdvancedAnalyticsSection = dynamic(
  () =>
    import("@/components/dashboard/AdvancedAnalyticsSection").then((m) => ({
      default: m.AdvancedAnalyticsSection,
    })),
  { loading: () => <Skeleton variant="chart" className="h-48 w-full" />, ssr: false }
);

export const AnalyticsNarrative = dynamic(
  () =>
    import("@/components/dashboard/AnalyticsNarrative").then((m) => ({
      default: m.AnalyticsNarrative,
    })),
  { ssr: false }
);
