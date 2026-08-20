import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Lock } from 'lucide-react';

// Renamed/restyled to match Encore's "Sync CRM" treatment — locked
// unconditionally (no plan_tier column exists in this project's schema,
// unlike Encore's simulated one, so there's nothing to check against; this
// is a deliberate, permanent lock rather than a tier-gated one).
export function ClaySyncDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sync CRM</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Upgrade to sync your CRM
          </DialogTitle>
          <DialogDescription>
            Two-way CRM sync is available on the Standard and Growth plans.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Standard ($299/mo) and Growth ($599/mo) wire every account change straight into Clay in real time. Your current plan doesn't include it yet.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Maybe later</Button>
          <Button onClick={() => setOpen(false)}>Talk to us</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
