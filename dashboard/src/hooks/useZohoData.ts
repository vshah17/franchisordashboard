import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEngagementData, ZohoEngagementRow } from "@/lib/zoho";

export type DatePeriod =
  | "prev-month"
  | "prev-year"
  | "this-year"
  | "last-3-years"
  | "last-3-months"
  | "ytd"
  | "last-6-months"
  | string; // specific month key like "28-02-2026"

export interface ZohoKPIs {
  totalLocations: number;
  totalSessions: number;
  totalEngagements: number;
  avgConversionRate: string;
  offHourEngagements: number;
  offHourEngagementRate: string;
  desktopEngagements: number;
  mobileEngagements: number;
  smsNotifications: number;
  smsFromCustomers: number;
  smsFromBusiness: number;
  emailNotifications: number;
  missedCalls: number;
  voiceMessages: number;
  contacts: number;
  locations: string[];
  partners: string[];
  availableMonths: string[]; // sorted newest-first, e.g. ["28-02-2026", "31-01-2026", ...]
}

export function parseReportingMonth(s: string): Date {
  const [day, month, year] = s.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatMonthLabel(key: string): string {
  const d = parseReportingMonth(key);
  if (isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getAvailableMonths(rows: ZohoEngagementRow[]): string[] {
  const unique = [...new Set(rows.map((r) => r.reportingMonth))];
  return unique.sort(
    (a, b) => parseReportingMonth(b).getTime() - parseReportingMonth(a).getTime(),
  );
}

function filterByPeriod(
  rows: ZohoEngagementRow[],
  period: DatePeriod,
): ZohoEngagementRow[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  switch (period) {
    case "prev-month": {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return rows.filter((r) => {
        const d = parseReportingMonth(r.reportingMonth);
        return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
      });
    }
    case "prev-year":
      return rows.filter(
        (r) => parseReportingMonth(r.reportingMonth).getFullYear() === currentYear - 1,
      );
    case "this-year":
    case "ytd":
      return rows.filter(
        (r) => parseReportingMonth(r.reportingMonth).getFullYear() === currentYear,
      );
    case "last-3-years":
      return rows.filter(
        (r) => parseReportingMonth(r.reportingMonth).getFullYear() >= currentYear - 2,
      );
    case "last-3-months": {
      const cutoff = new Date(currentYear, currentMonth - 3, 1);
      return rows.filter((r) => parseReportingMonth(r.reportingMonth) >= cutoff);
    }
    case "last-6-months": {
      const cutoff = new Date(currentYear, currentMonth - 6, 1);
      return rows.filter((r) => parseReportingMonth(r.reportingMonth) >= cutoff);
    }
    default:
      // Specific month key like "28-02-2026"
      return rows.filter((r) => r.reportingMonth === period);
  }
}

export function computeKPIs(
  activeRows: ZohoEngagementRow[],
  datePeriod: DatePeriod,
  locationFilter?: string,
  partnerFilter?: string,
): ZohoKPIs {
  // All partners across all data
  const allPartners = [...new Set(activeRows.map((r) => r.partner).filter(Boolean))].sort();

  // Filter to selected partner first
  const partnerRows = partnerFilter
    ? activeRows.filter((r) => r.partner === partnerFilter)
    : activeRows;

  const allLocations = [...new Set(partnerRows.map((r) => r.businessName).filter(Boolean))].sort();
  const availableMonths = getAvailableMonths(partnerRows);

  const periodRows = filterByPeriod(partnerRows, datePeriod);
  const rows = locationFilter
    ? periodRows.filter((r) => r.businessName === locationFilter)
    : periodRows;

  const totalLocations = locationFilter
    ? rows.length > 0 ? 1 : 0
    : new Set(rows.map((r) => r.businessName)).size;

  const sum = (fn: (r: ZohoEngagementRow) => number) =>
    rows.reduce((acc, r) => acc + fn(r), 0);

  const totalSessions = sum((r) => r.sessions);
  const totalEngagements = sum((r) => r.engagements);
  const offHourEngagements = sum((r) => r.offHourEngagement);
  const desktopEngagements = sum((r) => r.desktopEngagement);
  const mobileEngagements = sum((r) => r.mobileEngagement);
  const smsNotifications = sum((r) => r.smsNotifications);
  const smsFromCustomers = sum((r) => r.smsFromCustomers);
  const smsFromBusiness = sum((r) => r.smsFromBusiness);
  const emailNotifications = sum((r) => r.emailNotifications);
  const missedCalls = sum((r) => r.missedCalls);
  const voiceMessages = sum((r) => r.voiceMessages);
  const contacts = sum((r) => r.contacts);

  const rowsWithTraffic = rows.filter((r) => r.sessions > 0);
  const avgConversionRate =
    rowsWithTraffic.length > 0
      ? (
          rowsWithTraffic.reduce((acc, r) => acc + r.engagementRate, 0) /
          rowsWithTraffic.length
        ).toFixed(1)
      : "0.0";

  const offHourEngagementRate =
    totalEngagements > 0
      ? ((offHourEngagements / totalEngagements) * 100).toFixed(1)
      : "0.0";

  return {
    totalLocations,
    totalSessions,
    totalEngagements,
    avgConversionRate,
    offHourEngagements,
    offHourEngagementRate,
    desktopEngagements,
    mobileEngagements,
    smsNotifications,
    smsFromCustomers,
    smsFromBusiness,
    emailNotifications,
    missedCalls,
    voiceMessages,
    contacts,
    locations: allLocations,
    partners: allPartners,
    availableMonths,
  };
}

/** Raw rows from Zoho (all months, all partners). Cached by React Query. */
export function useZohoRows() {
  const hasCredentials =
    Boolean(import.meta.env.VITE_ZOHO_ACCESS_TOKEN) ||
    Boolean(import.meta.env.VITE_ZOHO_REFRESH_TOKEN);

  return useQuery({
    queryKey: ["zoho-rows"],
    queryFn: () => fetchEngagementData(), // no server-side filter — all partners fetched once
    enabled: hasCredentials,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Computed KPIs filtered by partner, date period, and optional location. */
export function useZohoKPIs(
  locationFilter?: string,
  datePeriod: DatePeriod = "prev-month",
  partnerFilter?: string,
) {
  const { data: allRows, isLoading, isError } = useZohoRows();

  const kpis = useMemo(() => {
    if (!allRows) return null;
    const activeRows = allRows.filter((r) => r.accountStatus.toUpperCase() === "ACTIVE");
    return computeKPIs(activeRows, datePeriod, locationFilter, partnerFilter);
  }, [allRows, datePeriod, locationFilter, partnerFilter]);

  return { data: kpis, isLoading, isError };
}
