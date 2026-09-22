import { useState } from "react";
import { HandHeart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { volunteers } from "@/lib/api";

const EMPTY = { name: "", phone: "", email: "", area: "", message: "" };

/**
 * Volunteer sign-up as a modal, opened from the "Join as a Volunteer" button.
 * Owns its own form state so the home page does not carry it, and clears the
 * fields after a successful submit — the dialog can be reopened, and stale
 * values would otherwise look like a second submission is pending.
 */
export function VolunteerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [vol, setVol] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vol.name || !vol.phone) {
      toast({ title: "Please fill required fields", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await volunteers.submit(vol);
      toast({ title: "Thank you for volunteering!", description: "We will contact you soon." });
      setVol(EMPTY);
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to submit", description: "Please try again later.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HandHeart className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl font-bold">Become a Volunteer</DialogTitle>
          <DialogDescription>
            Join hands with us to make a difference. Share your details and our team will reach out.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input className="rounded-xl" placeholder="Your name *" value={vol.name} onChange={(e) => setVol({ ...vol, name: e.target.value })} />
            <Input className="rounded-xl" placeholder="Phone *" value={vol.phone} onChange={(e) => setVol({ ...vol, phone: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input className="rounded-xl" type="email" placeholder="Email" value={vol.email} onChange={(e) => setVol({ ...vol, email: e.target.value })} />
            <Input className="rounded-xl" placeholder="Area / Location" value={vol.area} onChange={(e) => setVol({ ...vol, area: e.target.value })} />
          </div>
          <Textarea className="rounded-xl" placeholder="How would you like to help?" rows={4} value={vol.message} onChange={(e) => setVol({ ...vol, message: e.target.value })} />
          <Button type="submit" disabled={submitting} className="w-full rounded-full" size="lg">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <HandHeart className="mr-2 h-4 w-4" /> Join as Volunteer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
