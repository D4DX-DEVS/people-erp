import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BankAccount } from "@/config/donationDefaults";

interface DonateCardProps {
  /** Scannable QR. The bundled asset already carries the "DONATE HERE" wordmark,
   *  so the card deliberately renders no caption of its own. */
  qrImageUrl?: string;
  accounts: BankAccount[];
  whatsapp?: string;
  email?: string;
  className?: string;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="text-[13px] leading-relaxed text-foreground">
      <span className="text-muted-foreground">{label}:</span> {value}
    </p>
  );
}

/**
 * Donate panel for the About band: QR on a white plate, with the bank accounts
 * folded behind an "Account Number" toggle so the section keeps its height
 * until a donor asks for the details.
 */
export function DonateCard({ qrImageUrl, accounts, whatsapp, email, className }: DonateCardProps) {
  const [open, setOpen] = useState(false);
  const hasAccounts = accounts.length > 0;

  return (
    <div className={cn("flex h-full flex-col gap-3 rounded-3xl bg-gradient-hero p-4 text-primary-foreground shadow-xl", className)}>
      {qrImageUrl && (
        <div className="rounded-2xl bg-white p-3">
          <img
            src={qrImageUrl}
            alt="Scan to donate"
            loading="lazy"
            decoding="async"
            className="mx-auto h-auto w-full max-w-[220px] object-contain"
          />
        </div>
      )}

      {hasAccounts && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="donate-accounts"
            className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            Account Number
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-300", open && "rotate-180")} />
          </button>

          {/* grid-rows 0fr → 1fr animates to the panel's natural height, which a
              max-height guess cannot do without clipping longer account lists. */}
          <div
            id="donate-accounts"
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 pt-1">
                {accounts.map((acc, i) => (
                  <div key={`${acc.accountNumber || acc.bankName}-${i}`} className="rounded-xl bg-white p-3 shadow-sm">
                    <DetailRow label="Account Name" value={acc.accountName} />
                    <DetailRow label="Account No" value={acc.accountNumber} />
                    <DetailRow label="Account Type" value={acc.accountType} />
                    <DetailRow label="Bank" value={acc.bankName} />
                    <DetailRow label="Branch" value={acc.branch} />
                    <DetailRow label="IFSC Code" value={acc.ifsc} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {(whatsapp || email) && (
        <p className="mt-auto pt-1 text-[11px] leading-relaxed text-primary-foreground/80">
          For ensuring receipt please send transfer details to
          {whatsapp && <> the WhatsApp No: {whatsapp}</>}
          {whatsapp && email && " or"}
          {email && <> e-mail to {email}</>}
        </p>
      )}
    </div>
  );
}
