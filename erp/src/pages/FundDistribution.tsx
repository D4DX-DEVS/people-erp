import { useState, useEffect, useCallback } from "react";
import { HandCoins, Search, Loader2, IndianRupee, Calendar, CheckCircle, Download, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";
import { useRBAC } from "@/hooks/useRBAC";
import { applications } from "@/lib/api";
import { ApplicationDetailModal } from "@/components/modals/ApplicationDetailModal";

interface DistributionRow {
  paymentId: string | null;
  applicationId: string;
  applicationNumber: string;
  beneficiaryName: string;
  beneficiaryPhone: string;
  schemeName: string;
  projectName: string;
  amount: number;
  approvedAmount: number;
  approvedAt: string;
  installmentLabel: string;
  expectedDate: string;
  distributedAt: string;
  method: string;
  reference: string;
  district?: string;
  area?: string;
  unit?: string;
}

interface Summary {
  pendingCount: number;
  pendingAmount: number;
  distributedCount: number;
  distributedAmount: number;
}

const methodOptions = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "upi", label: "UPI" },
  { value: "digital_wallet", label: "Digital Wallet" },
];

const methodLabel = (value: string) =>
  methodOptions.find((m) => m.value === value)?.label || value || "-";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount || 0);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function FundDistribution() {
  const { hasAnyPermission } = useRBAC();
  const canDistribute = hasAnyPermission(['finances.manage', 'finances.read.regional', 'finances.read.all', 'super_admin', 'state_admin']);

  const [tab, setTab] = useState<"pending" | "distributed">("pending");
  const [rows, setRows] = useState<DistributionRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ pendingCount: 0, pendingAmount: 0, distributedCount: 0, distributedAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [detailApplicationId, setDetailApplicationId] = useState<string | null>(null);

  // "Mark as distributed" form
  const [selectedRow, setSelectedRow] = useState<DistributionRow | null>(null);
  const [distributedOn, setDistributedOn] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRows = useCallback(async (status: string, page: number, searchTerm: string) => {
    setLoading(true);
    try {
      const response = await applications.getDistributions({ status, page, limit: 10, search: searchTerm }) as any;
      setRows(Array.isArray(response.data) ? response.data : []);
      setSummary(response.summary || { pendingCount: 0, pendingAmount: 0, distributedCount: 0, distributedAmount: 0 });
      setTotalPages(response.pagination?.totalPages || 1);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load the distribution list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows(tab, currentPage, search);
  }, [fetchRows, tab, currentPage, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearch(searchInput);
  };

  const openDistributeDialog = (row: DistributionRow) => {
    setSelectedRow(row);
    setDistributedOn(new Date().toISOString().split("T")[0]);
    setMethod("cash");
    setReference("");
    setNotes("");
  };

  const handleConfirmDistribution = async () => {
    if (!selectedRow) return;
    setSaving(true);
    try {
      const response = await applications.markDistributed(selectedRow.applicationId, {
        paymentId: selectedRow.paymentId,
        distributedAt: distributedOn,
        method,
        referenceNumber: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      }) as any;

      if (response.success) {
        toast({
          title: "Distribution recorded",
          description: `₹${formatAmount(selectedRow.amount)} marked as given to ${selectedRow.beneficiaryName}. The receipt is ready now.`,
        });
        setSelectedRow(null);
        fetchRows(tab, currentPage, search);
      } else {
        toast({ title: "Error", description: response.message || "Could not record the distribution", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not record the distribution", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReceipt = async (paymentId: string | null) => {
    if (!paymentId) return;
    setDownloadingId(paymentId);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "/api";
      const token = localStorage.getItem("token");
      const franchiseSlug = localStorage.getItem("activeFranchiseSlug") || (import.meta.env.VITE_FRANCHISE_SLUG as string | undefined);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (franchiseSlug) headers["X-Franchise-Slug"] = franchiseSlug;

      const response = await fetch(`${baseUrl}/payments/${paymentId}/receipt`, { headers });
      if (!response.ok) throw new Error("Failed to download receipt");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", description: "Could not download the receipt. Please try again.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const isPending = tab === "pending";

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <HandCoins className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fund Distribution</h1>
            <p className="text-sm text-muted-foreground">
              Applications approved by the committee. Hand over the money, then mark it here — the receipt becomes available after that.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-5 pb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Waiting to be given
              </p>
              <p className="text-2xl font-bold text-amber-700">₹{formatAmount(summary.pendingAmount)}</p>
            </div>
            <Badge variant="outline" className="text-sm">{summary.pendingCount} people</Badge>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-5 pb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Already given
              </p>
              <p className="text-2xl font-bold text-green-700">₹{formatAmount(summary.distributedAmount)}</p>
            </div>
            <Badge variant="outline" className="text-sm">{summary.distributedCount} payments</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + search */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-4">
          <Tabs value={tab} onValueChange={(value) => { setTab(value as "pending" | "distributed"); setCurrentPage(1); }}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> To Be Distributed
              </TabsTrigger>
              <TabsTrigger value="distributed" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Distributed
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by beneficiary name, phone or application number..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
            {search && (
              <Button type="button" variant="outline" onClick={() => { setSearchInput(""); setSearch(""); setCurrentPage(1); }}>
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {isPending ? "Approved — Waiting for Distribution" : "Distributed Payments"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <HandCoins className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-sm">
                {search
                  ? "Nothing matches your search."
                  : isPending
                    ? "Nothing is waiting for distribution right now."
                    : "No distributions recorded yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application No.</TableHead>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Scheme</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <IndianRupee className="h-3.5 w-3.5" />
                          Amount
                        </span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {isPending ? "Approved On" : "Given On"}
                        </span>
                      </TableHead>
                      <TableHead className="text-center">{isPending ? "Action" : "Receipt"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={row.paymentId || `app-${row.applicationId}-${idx}`}>
                        <TableCell>
                          <button
                            className="font-mono text-sm font-medium text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                            onClick={() => setDetailApplicationId(row.applicationId)}
                          >
                            {row.applicationNumber}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.beneficiaryName}</div>
                          <div className="text-xs text-muted-foreground">{row.beneficiaryPhone}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{row.schemeName}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {[row.unit, row.area, row.district].filter(Boolean).join(" / ") || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{row.installmentLabel}</div>
                          {!isPending && row.method && (
                            <div className="text-xs text-muted-foreground">
                              {methodLabel(row.method)}{row.reference ? ` · ${row.reference}` : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${isPending ? "text-amber-700" : "text-green-700"}`}>
                            ₹{formatAmount(row.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(isPending ? row.approvedAt : row.distributedAt)}</span>
                          {isPending && row.expectedDate && (
                            <div className="text-xs text-muted-foreground">Due {formatDate(row.expectedDate)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isPending ? (
                            <Button
                              size="sm"
                              className="gap-1.5 bg-success hover:bg-success/90"
                              onClick={() => openDistributeDialog(row)}
                              disabled={!canDistribute}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Mark Given
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => handleDownloadReceipt(row.paymentId)}
                              disabled={!row.paymentId || downloadingId === row.paymentId}
                            >
                              {downloadingId === row.paymentId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              Receipt
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page =
                          totalPages <= 5
                            ? i + 1
                            : currentPage <= 3
                              ? i + 1
                              : currentPage >= totalPages - 2
                                ? totalPages - 4 + i
                                : currentPage - 2 + i;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Mark as distributed */}
      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Money Given to Beneficiary?</DialogTitle>
            <DialogDescription>
              Record the hand-over so the receipt can be generated. This does not send any money — it only records what already happened.
            </DialogDescription>
          </DialogHeader>

          {selectedRow && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/40 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Beneficiary</span>
                  <span className="font-medium">{selectedRow.beneficiaryName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Application</span>
                  <span className="font-mono">{selectedRow.applicationNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedRow.installmentLabel}</span>
                  <span className="font-bold text-green-700">₹{formatAmount(selectedRow.amount)}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date given <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={distributedOn}
                    onChange={(e) => setDistributedOn(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>How was it given? <span className="text-destructive">*</span></Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {methodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {method !== "cash" && (
                <div className="space-y-2">
                  <Label>{method === "cheque" ? "Cheque number" : "Transaction / reference number"}</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={method === "cheque" ? "e.g. 004512" : "e.g. UTR or transaction ID"}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything worth recording about this hand-over"
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRow(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDistribution}
              disabled={saving || !distributedOn}
              className="bg-success hover:bg-success/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApplicationDetailModal
        isOpen={!!detailApplicationId}
        applicationId={detailApplicationId}
        onClose={() => setDetailApplicationId(null)}
      />
    </div>
  );
}
