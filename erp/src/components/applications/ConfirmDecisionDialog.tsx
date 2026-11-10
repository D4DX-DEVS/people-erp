import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface PendingDecision {
  action: "approve" | "reject";
  applicantName: string;
  applicationNumber: string;
  /** Amount approved on "approve" (the requested amount) */
  amount?: number;
}

interface ConfirmDecisionDialogProps {
  /** Decision to confirm, or null when closed */
  decision: PendingDecision | null;
  onConfirm: (remarks: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Confirmation for the quick Approve/Reject buttons on application lists.
 * Stays open while the request runs so a failure is visible next to it.
 */
export function ConfirmDecisionDialog({ decision, onConfirm, onCancel }: ConfirmDecisionDialogProps) {
  // Keep showing the last decision while the dialog animates closed
  const [shown, setShown] = useState<PendingDecision | null>(decision);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (decision) {
      setShown(decision);
      setRemarks("");
    }
  }, [decision]);

  const isApprove = shown?.action === "approve";

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm(remarks.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={!!decision} onOpenChange={(open) => !open && !saving && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isApprove ? "Approve application?" : "Reject application?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {shown?.applicantName} · {shown?.applicationNumber}
            {isApprove && shown?.amount !== undefined && <> · ₹{shown.amount.toLocaleString()}</>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decision-remarks">{isApprove ? "Remarks (optional)" : "Reason (optional)"}</Label>
          <Textarea
            id="decision-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <Button variant={isApprove ? "default" : "destructive"} onClick={confirm} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isApprove ? "Approve" : "Reject"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
