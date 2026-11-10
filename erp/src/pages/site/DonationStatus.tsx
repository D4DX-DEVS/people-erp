import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell, PageHero, PageBody } from "@/components/site/SiteShell";
import { onlinePayments, type OnlinePaymentStatus } from "@/lib/api";

// Easebuzz settles most payments before redirecting back; when the bank is
// still answering, keep asking for about half a minute, then show "pending".
const POLL_MS = 4000;
const MAX_POLLS = 8;

const NOT_PAID_MESSAGES: Record<string, string> = {
  usercancelled: "The payment was cancelled.",
  dropped: "The payment was not completed at the bank.",
  bounced: "The payment page was closed before paying.",
  autorefunded: "The bank could not confirm this payment in time, so it has been refunded.",
  amount_mismatch: "The amount paid did not match the donation. Please contact us with the reference below.",
  initiate_failed: "The payment could not be started.",
};

const formatINR = (n: number) => `₹ ${n.toLocaleString("en-IN")}`;

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * Landing page Easebuzz sends the donor back to (via the API's surl/furl
 * handler): /donate/status?txnid=… Shows the verified result from our API.
 */
export default function DonationStatus() {
  const [params] = useSearchParams();
  const txnid = params.get("txnid") || "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["online-payment-status", txnid],
    queryFn: async () => (await onlinePayments.status(txnid)).data as OnlinePaymentStatus,
    enabled: !!txnid,
    refetchInterval: (query) =>
      query.state.data?.final || query.state.dataUpdateCount >= MAX_POLLS ? false : POLL_MS,
    retry: 1,
  });

  return (
    <SiteShell>
      <PageHero title="Donation Status" />
      <PageBody className="mx-auto max-w-xl">
        {!txnid || isError ? (
          <Result icon={<XCircle className="h-12 w-12 text-destructive" />} title="Payment not found">
            We could not find this payment. If money was debited, please contact us.
          </Result>
        ) : isLoading || !data ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data.status === "success" ? (
          <Result icon={<CheckCircle2 className="h-12 w-12 text-emerald-600" />} title="Thank you for your donation!">
            Your donation of <strong className="text-foreground">{formatINR(data.amount)}</strong> was received.
          </Result>
        ) : data.final ? (
          <Result icon={<XCircle className="h-12 w-12 text-destructive" />} title="Payment not completed">
            {NOT_PAID_MESSAGES[data.status] || "The payment failed."} If any amount was debited, please contact us with the reference below.
          </Result>
        ) : (
          <Result icon={<Clock className="h-12 w-12 text-amber-500" />} title="Confirming your payment">
            Your bank has not confirmed the payment yet. This page updates on its own — or check back in a few minutes.
          </Result>
        )}

        {data && (
          <div className="mt-6 rounded-2xl bg-muted/50 px-4 py-2">
            <Detail label="Amount" value={formatINR(data.amount)} />
            <Detail label="Donation No." value={data.donationNumber} />
            <Detail label="Payment ID" value={data.easepayid} />
            <Detail label="Payment mode" value={data.mode} />
            <Detail label="Reference" value={data.txnid} />
            <Detail label="Date" value={new Date(data.createdAt).toLocaleString("en-IN")} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {data && data.final && data.status !== "success" && (
            <Button asChild className="rounded-full">
              <Link to="/#donate">Try Again</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </PageBody>
    </SiteShell>
  );
}

function Result({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      {icon}
      <h2 className="mt-4 text-2xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-muted-foreground">{children}</p>
    </div>
  );
}
