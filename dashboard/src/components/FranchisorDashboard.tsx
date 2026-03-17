import { useState } from "react";
import { useZohoKPIs, formatMonthLabel, type DatePeriod } from "@/hooks/useZohoData";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import agentzLogo from "@/assets/agentz-logo.png";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Building2,
  BarChart3,
  MessageSquare,
  Clock,
  Monitor,
  Smartphone,
  Mail,
  PhoneMissed,
  Voicemail,
  Users,
  CalendarDays,
} from "lucide-react";

// ─── Stat card helper ────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: "up" | "down" | null;
}

const StatCard = ({ title, value, subtitle, icon: Icon, iconBg, trend }: StatCardProps) => (
  <Card className="shadow-soft hover:shadow-medium transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`${iconBg} p-2 rounded-lg`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-success" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
);

// ─── Inline stat (used inside grouped cards) ─────────────────────────────────

interface InlineStatProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  iconBg: string;
}

const InlineStat = ({ label, value, icon: Icon, iconBg }: InlineStatProps) => (
  <div className="flex flex-col items-center gap-2 p-4 bg-accent/20 rounded-xl">
    <div className={`${iconBg} p-2.5 rounded-lg`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground text-center leading-tight">{label}</p>
  </div>
);

// ─── Loading spinner ──────────────────────────────────────────────────────────

const Spin = () => <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline" />;

// ─── Date period options ──────────────────────────────────────────────────────

const PRESET_PERIODS: { value: DatePeriod; label: string }[] = [
  { value: "prev-month", label: "Previous Month" },
  { value: "prev-year", label: "Previous Year" },
  { value: "this-year", label: "This Year" },
  { value: "last-3-years", label: "Last 3 Years" },
  { value: "last-3-months", label: "Last 3 Months" },
  { value: "ytd", label: "Year to Date" },
  { value: "last-6-months", label: "Last 6 Months" },
];

// ─── Main dashboard ───────────────────────────────────────────────────────────

const FranchisorDashboard = () => {
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("prev-month");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [partnerFilter, setPartnerFilter] = useState<string>("Agentz");

  const { data: zohoKPIs, isLoading } = useZohoKPIs(
    locationFilter === "all" ? undefined : locationFilter,
    datePeriod,
    partnerFilter,
  );

  if (selectedLocation) {
    return (
      <LocationDetail
        name={selectedLocation}
        onBack={() => setSelectedLocation(null)}
      />
    );
  }

  const loading = isLoading;
  const val = (n: number | undefined) =>
    loading ? <Spin /> : (n ?? 0).toLocaleString();
  const pct = (s: string | undefined) =>
    loading ? <Spin /> : `${s ?? "0.0"}%`;

  const zohoLocations = zohoKPIs?.locations ?? [];
  const availableMonths = zohoKPIs?.availableMonths ?? [];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <img src={agentzLogo} alt="Agentz" className="h-8" />
          <div className="h-8 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">Franchisor Dashboard</h1>
            <p className="text-sm text-muted-foreground font-medium mt-0.5">
              {partnerFilter}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Partner filter */}
          <Select
            value={partnerFilter}
            onValueChange={(v) => { setPartnerFilter(v); setLocationFilter("all"); }}
          >
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Select Partner" />
            </SelectTrigger>
            <SelectContent>
              {(zohoKPIs?.partners ?? []).map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location filter */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {(zohoLocations.length > 0
                ? zohoLocations
                : ["Downtown LA", "Santa Monica", "Pasadena", "Long Beach"]
              ).map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date period filter */}
          <Select value={datePeriod} onValueChange={(v) => setDatePeriod(v as DatePeriod)}>
            <SelectTrigger className="w-[180px]">
              <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Reporting Period</SelectLabel>
                {PRESET_PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectGroup>
              {availableMonths.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Specific Month</SelectLabel>
                    {availableMonths.map((key) => (
                      <SelectItem key={key} value={key}>
                        {formatMonthLabel(key)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Row 1: Core KPIs ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">Overview</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Total Locations"
            value={val(zohoKPIs?.totalLocations)}
            subtitle="Active franchises"
            icon={Building2}
            iconBg="bg-primary"
          />
          <StatCard
            title="Total Sessions"
            value={val(zohoKPIs?.totalSessions)}
            subtitle="All channels"
            icon={MessageSquare}
            iconBg="bg-emerald-500"
            trend="up"
          />
          <StatCard
            title="Total Engagements"
            value={val(zohoKPIs?.totalEngagements)}
            subtitle="Sessions with bot activity"
            icon={BarChart3}
            iconBg="bg-amber-500"
          />
          <StatCard
            title="Avg Conversion"
            value={pct(zohoKPIs?.avgConversionRate)}
            subtitle="Engagement rate"
            icon={TrendingUp}
            iconBg="bg-violet-500"
          />
        </div>
      </div>

      {/* ── Row 2: Engagement breakdown ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">Engagement Breakdown</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            title="Off-Hour Engagement"
            value={val(zohoKPIs?.offHourEngagements)}
            subtitle="Outside business hours"
            icon={Clock}
            iconBg="bg-indigo-500"
          />
          <StatCard
            title="Off-Hour Rate"
            value={pct(zohoKPIs?.offHourEngagementRate)}
            subtitle="Of total engagements"
            icon={Clock}
            iconBg="bg-indigo-400"
          />
          <StatCard
            title="Desktop Engagement"
            value={val(zohoKPIs?.desktopEngagements)}
            subtitle="Desktop sessions"
            icon={Monitor}
            iconBg="bg-sky-500"
          />
          <StatCard
            title="Mobile Engagement"
            value={val(zohoKPIs?.mobileEngagements)}
            subtitle="Mobile sessions"
            icon={Smartphone}
            iconBg="bg-pink-500"
          />
          <StatCard
            title="Contacts Captured"
            value={val(zohoKPIs?.contacts)}
            subtitle="Lead contacts"
            icon={Users}
            iconBg="bg-teal-500"
          />
        </div>
      </div>

      {/* ── Row 3: Communication activity ── */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base text-foreground">Communication Activity</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <InlineStat
              label="SMS from Customers"
              value={val(zohoKPIs?.smsFromCustomers)}
              icon={MessageSquare}
              iconBg="bg-green-500"
            />
            <InlineStat
              label="SMS from Business"
              value={val(zohoKPIs?.smsFromBusiness)}
              icon={MessageSquare}
              iconBg="bg-cyan-500"
            />
            <InlineStat
              label="SMS Notifications"
              value={val(zohoKPIs?.smsNotifications)}
              icon={MessageSquare}
              iconBg="bg-lime-500"
            />
            <InlineStat
              label="Email Notifications"
              value={val(zohoKPIs?.emailNotifications)}
              icon={Mail}
              iconBg="bg-blue-500"
            />
            <InlineStat
              label="Missed Calls"
              value={val(zohoKPIs?.missedCalls)}
              icon={PhoneMissed}
              iconBg="bg-red-500"
            />
            <InlineStat
              label="Voice Messages"
              value={val(zohoKPIs?.voiceMessages)}
              icon={Voicemail}
              iconBg="bg-orange-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Row 4: Location summary table ── */}
      {zohoLocations.length > 0 && locationFilter === "all" && (
        <Card className="shadow-soft">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-base text-foreground">Location Summary</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <LocationSummaryTable
              locations={zohoLocations}
              onSelect={(name) => setLocationFilter(name)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Location summary table ───────────────────────────────────────────────────

interface LocationSummaryTableProps {
  locations: string[];
  onSelect: (name: string) => void;
}

const LocationSummaryTable = ({ locations, onSelect }: LocationSummaryTableProps) => (
  <div className="divide-y divide-border">
    {locations.map((name) => (
      <button
        key={name}
        onClick={() => onSelect(name)}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-accent/40 rounded-lg transition-colors text-left group"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground text-sm">{name}</span>
        </div>
        <Badge variant="outline" className="text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          View
        </Badge>
      </button>
    ))}
  </div>
);

// ─── Location detail view ─────────────────────────────────────────────────────

interface LocationDetailProps {
  name: string;
  onBack: () => void;
}

const LocationDetail = ({ name, onBack }: LocationDetailProps) => {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("prev-month");
  const { data: kpis, isLoading } = useZohoKPIs(name, datePeriod);

  const loading = isLoading;
  const val = (n: number | undefined) =>
    loading ? <Spin /> : (n ?? 0).toLocaleString();
  const pct = (s: string | undefined) =>
    loading ? <Spin /> : `${s ?? "0.0"}%`;

  const availableMonths = kpis?.availableMonths ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Location Detail
          </p>
        </div>
        <Select value={datePeriod} onValueChange={(v) => setDatePeriod(v as DatePeriod)}>
          <SelectTrigger className="w-[180px]">
            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Reporting Period</SelectLabel>
              {PRESET_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectGroup>
            {availableMonths.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Specific Month</SelectLabel>
                  {availableMonths.map((key) => (
                    <SelectItem key={key} value={key}>
                      {formatMonthLabel(key)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Core KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Sessions" value={val(kpis?.totalSessions)} subtitle="All channels" icon={MessageSquare} iconBg="bg-emerald-500" trend="up" />
        <StatCard title="Total Engagements" value={val(kpis?.totalEngagements)} subtitle="Bot activity" icon={BarChart3} iconBg="bg-amber-500" />
        <StatCard title="Avg Conversion" value={pct(kpis?.avgConversionRate)} subtitle="Engagement rate" icon={TrendingUp} iconBg="bg-violet-500" />
        <StatCard title="Contacts Captured" value={val(kpis?.contacts)} subtitle="Leads" icon={Users} iconBg="bg-teal-500" />
      </div>

      {/* Engagement breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Off-Hour Engagement" value={val(kpis?.offHourEngagements)} subtitle="After hours" icon={Clock} iconBg="bg-indigo-500" />
        <StatCard title="Off-Hour Rate" value={pct(kpis?.offHourEngagementRate)} subtitle="Of total engagements" icon={Clock} iconBg="bg-indigo-400" />
        <StatCard title="Desktop Engagement" value={val(kpis?.desktopEngagements)} subtitle="Desktop" icon={Monitor} iconBg="bg-sky-500" />
        <StatCard title="Mobile Engagement" value={val(kpis?.mobileEngagements)} subtitle="Mobile" icon={Smartphone} iconBg="bg-pink-500" />
      </div>

      {/* Communication */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base text-foreground">Communication Activity</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <InlineStat label="SMS from Customers" value={val(kpis?.smsFromCustomers)} icon={MessageSquare} iconBg="bg-green-500" />
            <InlineStat label="SMS from Business" value={val(kpis?.smsFromBusiness)} icon={MessageSquare} iconBg="bg-cyan-500" />
            <InlineStat label="SMS Notifications" value={val(kpis?.smsNotifications)} icon={MessageSquare} iconBg="bg-lime-500" />
            <InlineStat label="Email Notifications" value={val(kpis?.emailNotifications)} icon={Mail} iconBg="bg-blue-500" />
            <InlineStat label="Missed Calls" value={val(kpis?.missedCalls)} icon={PhoneMissed} iconBg="bg-red-500" />
            <InlineStat label="Voice Messages" value={val(kpis?.voiceMessages)} icon={Voicemail} iconBg="bg-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FranchisorDashboard;
