import { ArrowRight, Flame, Heart, QrCode } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface CreditSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number | null;
}

export function CreditSupportDialog({
  open,
  onOpenChange,
  balance,
}: CreditSupportDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-[460px]">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
            <Flame className="h-4 w-4 fill-current" />
            Community powered
          </div>
          <DialogTitle className="text-xl leading-tight">Top up the Roast Engine</DialogTitle>
          <DialogDescription className="max-w-sm pt-1 text-sm leading-6">
            Your donation helps us continue developing Lokalhost.club, improve the platform,
            and keep the indie dev chaos alive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          <div className="flex items-center justify-between border-b pb-3 text-xs">
            <span className="text-muted-foreground">Your weekly AI balance</span>
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {balance == null ? "--" : `${balance} credits`}
            </span>
          </div>

          <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-md border bg-white p-2 shadow-sm">
            <img
              src="/lokalhost-donation-qr.jpg"
              alt="Lokalhost donation QR code for GCash and InstaPay"
              className="block h-auto w-full"
            />
          </div>

          <div className="flex items-start gap-3 border-l-2 border-primary px-3 py-2">
            <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Scan with GCash or an InstaPay-enabled wallet</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Donations support Lokalhost.club development and do not automatically add
                credits to your account.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <Heart className="h-4 w-4 text-primary" />
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate("/roast");
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Roast Engine
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
