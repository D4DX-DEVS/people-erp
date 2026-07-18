import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, RefreshCw, Download, Wallet, TrendingUp,
  Users, FileCheck, HeartHandshake, Clock, Loader2, ShieldAlert, PiggyBank,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { consolidatedReports } from "@/lib/api";
import { downloadCSV } from "@/utils/export";

// Fixed series colors (CVD-validated): requested / approved / disbursed / donations
const SERIES_COLORS = {
  requested: "#2563eb",
  approved: "#d97706",
  disbursed: "#0d9488",
  donations: "#9333ea",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  under_review: "Under Review",
  field_verification: "Field Verification",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  pending_committee_approval: "Committee Approval",
  approved: "Approved",
  rejected: "Rejected",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  disbursed: "Disbursed",
  completed: "Completed",
};

interface Overview {
  applications: {
    total: number;
    byStatus: Record<string, number>;
    approved: number;
    rejected: number;
    inProgress: number;
    autoRejected: number;
    approvalRate: number;
    avgApprovalDays: number | null;
    uniqueBeneficiaries: number;
  };
  funds: {
    totalBudget: number;
    totalRequested: number;
    totalApproved: number;
    totalDisbursed: number;
    totalPendingDisbursement: number;
    overdueAmount: number;
    overdueCount: number;
    failedPayments: number;
    budgetUtilization: number;
    disbursementEfficiency: number;
    completedPaymentCount: number;
    pendingPaymentCount: number;
  };
  beneficiaries: { total: number; verified: number; active: number };
  donations: { totalReceived: number; count: number };
  entities: { totalProjects: number; totalSchemes: number };
}

interface SchemeRow {
  schemeId: string;
  name: string;
  code: string;
  category: string;
  status: string;
  project: { id: string; name: string } | null;
  budgetTotal: number;
  applications: { total: number; approved: number; rejected: number; inProgress: number; completed: number };
  beneficiaries: number;
  requestedAmount: number;
  approvedAmount: number;
  disbursedAmount: number;
  pendingDisbursement: number;
  approvalRate: number;
  budgetUtilization: number;
  disbursementEfficiency: number;
}

interface RegionRow {
  regionId: string | null;
  regionName: string;
  applications: { total: number; approved: number; rejected: number; inProgress: number };
  beneficiaries: number;
  requestedAmount: number;
  approvedAmount: number;
  disbursedAmount: number;
  pendingDisbursement: number;
  approvalRate: number;
  disbursementEfficiency: number;
}

interface FundsFlowRow {
  month: string;
  monthLabel: string;
  requested: number;
  approved: number;
  disbursed: number;
  donations: number;
}

interface Pipeline {
  statusFunnel: { status: string; count: number; requestedAmount: number }[];
  stageDistribution: { stage: string; count: number }[];
  pendingAging: Record<string, { count: number; requestedAmount: number }>;
  processingTime: { avgDays: number | null; minDays: number | null; maxDays: number | null; approvedCount: number };
  interviews: { scheduled: number; pending: number; passed: number; failed: number };
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatCompact = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount || 0);

function KpiCard({
  title,
  value,
  icon: Icon,
  subLabel,
  alert = false,
}: {
  title: string;
  value: string;
  icon: typeof Wallet;
  subLabel?: string;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold truncate">{value}</p>
            {subLabel && (
              <p className={`text-xs ${alert ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {subLabel}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-gradient-primary p-3 shadow-elegant shrink-0">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
}

export default function ConsolidatedReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regionLevel, setRegionLevel] = useState<"district" | "area" | "unit">("district");
  const [months, setMonths] = useState(12);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [schemes, setSchemes] = useState<SchemeRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [fundsFlow, setFundsFlow] = useState<FundsFlowRow[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);

  const isAllowed = user?.role === "super_admin" || user?.role === "state_admin";

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const dateParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const [ovRes, schemeRes, regionRes, flowRes, pipeRes] = await Promise.all([
        consolidatedReports.getOverview(dateParams),
        consolidatedReports.getSchemes(dateParams),
        consolidatedReports.getRegions({ level: regionLevel, ...dateParams }),
        consolidatedReports.getFundsFlow(months),
        consolidatedReports.getPipeline(),
      ]);
      setOverview((ovRes.data as { overview?: Overview })?.overview || null);
      setSchemes((schemeRes.data as { schemes?: SchemeRow[] })?.schemes || []);
      setRegions((regionRes.data as { regions?: RegionRow[] })?.regions || []);
      setFundsFlow((flowRes.data as { fundsFlow?: FundsFlowRow[] })?.fundsFlow || []);
      setPipeline((pipeRes.data as { pipeline?: Pipeline })?.pipeline || null);
    } catch (error) {
      toast({
        title: "Failed to load consolidated reports",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, regionLevel, months]);

  useEffect(() => {
    if (isAllowed) loadAll();
  }, [isAllowed, loadAll]);

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center py-24">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
            <h2 className="text-lg font-semibold">Access Restricted</h2>
            <p className="text-sm text-muted-foreground">
              Consolidated reports are available to Super Admin and State Admin only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exportSchemesCSV = () => {
    const csv = toCSV(
      ["Scheme", "Code", "Category", "Project", "Budget", "Applications", "Approved", "Rejected", "In Progress", "Beneficiaries", "Requested Amount", "Approved Amount", "Disbursed Amount", "Pending Disbursement", "Approval Rate %", "Budget Utilization %"],
      schemes.map(s => [
        s.name, s.code, s.category, s.project?.name || "", s.budgetTotal,
        s.applications.total, s.applications.approved, s.applications.rejected, s.applications.inProgress,
        s.beneficiaries, s.requestedAmount, s.approvedAmount, s.disbursedAmount, s.pendingDisbursement,
        s.approvalRate, s.budgetUtilization,
      ])
    );
    downloadCSV(csv, `scheme-consolidation-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportRegionsCSV = () => {
    const csv = toCSV(
      [regionLevel.charAt(0).toUpperCase() + regionLevel.slice(1), "Applications", "Approved", "Rejected", "In Progress", "Beneficiaries", "Requested Amount", "Approved Amount", "Disbursed Amount", "Pending Disbursement", "Approval Rate %"],
      regions.map(r => [
        r.regionName, r.applications.total, r.applications.approved, r.applications.rejected,
        r.applications.inProgress, r.beneficiaries, r.requestedAmount, r.approvedAmount,
        r.disbursedAmount, r.pendingDisbursement, r.approvalRate,
      ])
    );
    downloadCSV(csv, `${regionLevel}-consolidation-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportFundsFlowCSV = () => {
    const csv = toCSV(
      ["Month", "Requested", "Approved", "Disbursed", "Donations Received"],
      fundsFlow.map(f => [f.month, f.requested, f.approved, f.disbursed, f.donations])
    );
    downloadCSV(csv, `funds-flow-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const funds = overview?.funds;
  const apps = overview?.applications;
  const maxFunnelCount = pipeline ? Math.max(...pipeline.statusFunnel.map(s => s.count), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Consolidated Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Organisation-wide consolidation of applications, approvals, spending and donations
          </p>
        </div>
        <Button variant="outline" onClick={loadAll} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Date filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="cr-start">Start Date</Label>
              <Input id="cr-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cr-end">End Date</Label>
              <Input id="cr-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); }}>
              Clear
            </Button>
            <p className="text-xs text-muted-foreground ml-auto">
              Date range applies to applications, payments and donations. Budgets and beneficiary totals are cumulative.
            </p>
          </div>
        </CardContent>
      </Card>

      {loading && !overview ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Money KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Budget"
              value={formatCurrency(funds?.totalBudget || 0)}
              icon={PiggyBank}
              subLabel={`${funds?.budgetUtilization || 0}% utilised`}
            />
            <KpiCard
              title="Committed (Approved)"
              value={formatCurrency(funds?.totalApproved || 0)}
              icon={FileCheck}
              subLabel={`${apps?.approved || 0} approved applications`}
            />
            <KpiCard
              title="Disbursed"
              value={formatCurrency(funds?.totalDisbursed || 0)}
              icon={Wallet}
              subLabel={`${funds?.disbursementEfficiency || 0}% of committed · ${funds?.completedPaymentCount || 0} payments`}
            />
            <KpiCard
              title="Pending Disbursement"
              value={formatCurrency(funds?.totalPendingDisbursement || 0)}
              icon={Clock}
              subLabel={`${funds?.pendingPaymentCount || 0} payments · ${funds?.overdueCount || 0} overdue`}
              alert={(funds?.overdueCount || 0) > 0}
            />
          </div>

          {/* Programme KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Applications"
              value={String(apps?.total || 0)}
              icon={TrendingUp}
              subLabel={`${apps?.inProgress || 0} in pipeline · ${apps?.rejected || 0} rejected`}
            />
            <KpiCard
              title="Approval Rate"
              value={`${apps?.approvalRate || 0}%`}
              icon={FileCheck}
              subLabel={apps?.avgApprovalDays != null ? `avg ${apps.avgApprovalDays} days to approve` : "no approvals yet"}
            />
            <KpiCard
              title="Beneficiaries Served"
              value={String(apps?.uniqueBeneficiaries || 0)}
              icon={Users}
              subLabel={`${overview?.beneficiaries.total || 0} registered · ${overview?.beneficiaries.verified || 0} verified`}
            />
            <KpiCard
              title="Donations Received"
              value={formatCurrency(overview?.donations.totalReceived || 0)}
              icon={HeartHandshake}
              subLabel={`${overview?.donations.count || 0} completed donations`}
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="funds-flow" className="space-y-4">
            <TabsList>
              <TabsTrigger value="funds-flow">Funds Flow</TabsTrigger>
              <TabsTrigger value="schemes">Schemes</TabsTrigger>
              <TabsTrigger value="regions">Regions</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            </TabsList>

            {/* ── Funds Flow ── */}
            <TabsContent value="funds-flow" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Monthly Funds Flow</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={String(months)} onValueChange={v => setMonths(parseInt(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 months</SelectItem>
                        <SelectItem value="12">12 months</SelectItem>
                        <SelectItem value="24">24 months</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={exportFundsFlowCSV}>
                      <Download className="mr-2 h-4 w-4" /> CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={fundsFlow} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tickFormatter={formatCompact} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={80} />
                      <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} />
                      <Legend />
                      <Bar dataKey="requested" name="Requested" fill={SERIES_COLORS.requested} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approved" name="Approved" fill={SERIES_COLORS.approved} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="disbursed" name="Disbursed" fill={SERIES_COLORS.disbursed} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="donations" name="Donations In" fill={SERIES_COLORS.donations} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Requested</TableHead>
                        <TableHead className="text-right">Approved</TableHead>
                        <TableHead className="text-right">Disbursed</TableHead>
                        <TableHead className="text-right">Donations In</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fundsFlow.map(f => (
                        <TableRow key={f.month}>
                          <TableCell className="font-medium">{f.month}</TableCell>
                          <TableCell className="text-right">{formatCurrency(f.requested)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(f.approved)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(f.disbursed)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(f.donations)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Schemes ── */}
            <TabsContent value="schemes">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Scheme-wise Consolidation ({schemes.length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportSchemesCSV}>
                    <Download className="mr-2 h-4 w-4" /> CSV
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scheme</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Apps</TableHead>
                        <TableHead className="text-right">Approved</TableHead>
                        <TableHead className="text-right">Committed</TableHead>
                        <TableHead className="text-right">Disbursed</TableHead>
                        <TableHead className="text-right">Pending Pay</TableHead>
                        <TableHead className="w-40">Budget Utilisation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schemes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No schemes found for the selected period
                          </TableCell>
                        </TableRow>
                      ) : schemes.map(s => (
                        <TableRow key={s.schemeId}>
                          <TableCell>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              {s.code}
                              <Badge variant="outline" className="text-[10px]">{s.category?.replace(/_/g, " ")}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(s.budgetTotal)}</TableCell>
                          <TableCell className="text-right">{s.applications.total}</TableCell>
                          <TableCell className="text-right">
                            {s.applications.approved}
                            <span className="text-xs text-muted-foreground"> ({s.approvalRate}%)</span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(s.approvedAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.disbursedAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.pendingDisbursement)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(s.budgetUtilization, 100)} className="h-2" />
                              <span className="text-xs w-10 text-right">{s.budgetUtilization}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Regions ── */}
            <TabsContent value="regions">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Regional Consolidation ({regions.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={regionLevel} onValueChange={v => setRegionLevel(v as typeof regionLevel)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="district">District</SelectItem>
                        <SelectItem value="area">Area</SelectItem>
                        <SelectItem value="unit">Unit</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={exportRegionsCSV}>
                      <Download className="mr-2 h-4 w-4" /> CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="capitalize">{regionLevel}</TableHead>
                        <TableHead className="text-right">Apps</TableHead>
                        <TableHead className="text-right">Approved</TableHead>
                        <TableHead className="text-right">In Progress</TableHead>
                        <TableHead className="text-right">Beneficiaries</TableHead>
                        <TableHead className="text-right">Committed</TableHead>
                        <TableHead className="text-right">Disbursed</TableHead>
                        <TableHead className="text-right">Pending Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No regional data for the selected period
                          </TableCell>
                        </TableRow>
                      ) : regions.map(r => (
                        <TableRow key={r.regionId || r.regionName}>
                          <TableCell className="font-medium">{r.regionName}</TableCell>
                          <TableCell className="text-right">{r.applications.total}</TableCell>
                          <TableCell className="text-right">
                            {r.applications.approved}
                            <span className="text-xs text-muted-foreground"> ({r.approvalRate}%)</span>
                          </TableCell>
                          <TableCell className="text-right">{r.applications.inProgress}</TableCell>
                          <TableCell className="text-right">{r.beneficiaries}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.approvedAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.disbursedAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.pendingDisbursement)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Pipeline ── */}
            <TabsContent value="pipeline" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Application Status Funnel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pipeline?.statusFunnel.map(s => (
                      <div key={s.status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{STATUS_LABELS[s.status] || s.status}</span>
                          <span className="text-muted-foreground">
                            {s.count} · {formatCompact(s.requestedAmount)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded bg-muted">
                          <div
                            className="h-2.5 rounded"
                            style={{
                              width: `${Math.max((s.count / maxFunnelCount) * 100, 2)}%`,
                              backgroundColor: SERIES_COLORS.requested,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {(!pipeline || pipeline.statusFunnel.length === 0) && (
                      <p className="text-sm text-muted-foreground py-6 text-center">No applications yet</p>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pending Applications Ageing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          ["0to7days", "0–7 days"],
                          ["8to30days", "8–30 days"],
                          ["31to90days", "31–90 days"],
                          ["over90days", "Over 90 days"],
                        ] as const).map(([key, label]) => {
                          const bucket = pipeline?.pendingAging?.[key] || { count: 0, requestedAmount: 0 };
                          const isStale = key === "over90days" && bucket.count > 0;
                          return (
                            <div key={key} className={`rounded-lg border p-3 ${isStale ? "border-destructive/50 bg-destructive/5" : ""}`}>
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <p className="text-xl font-bold">{bucket.count}</p>
                              <p className="text-xs text-muted-foreground">{formatCompact(bucket.requestedAmount)} requested</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Processing & Interviews</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Avg. days to approval</p>
                        <p className="text-xl font-bold">{pipeline?.processingTime.avgDays ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fastest / Slowest</p>
                        <p className="text-xl font-bold">
                          {pipeline?.processingTime.minDays ?? "—"} / {pipeline?.processingTime.maxDays ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interviews passed</p>
                        <p className="text-xl font-bold">{pipeline?.interviews.passed ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interviews pending / failed</p>
                        <p className="text-xl font-bold">
                          {pipeline?.interviews.pending ?? 0} / {pipeline?.interviews.failed ?? 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Stage Distribution (in-progress applications)</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Applications</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!pipeline || pipeline.stageDistribution.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                            No applications currently in the pipeline
                          </TableCell>
                        </TableRow>
                      ) : pipeline.stageDistribution.map(s => (
                        <TableRow key={s.stage}>
                          <TableCell className="font-medium">{s.stage}</TableCell>
                          <TableCell className="text-right">{s.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
