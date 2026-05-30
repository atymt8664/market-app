import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { P17_MOCK } from "../mock-strings";
import { P17_PRIMARY_BTN, P17_RADIO_ROW, P17_RADIO_ROW_ACTIVE } from "../styles";

const ISSUE_OPTIONS = [
  { id: "not_received", label: P17_MOCK.issue.notReceived },
  { id: "different", label: P17_MOCK.issue.differentProduct },
  { id: "damaged", label: P17_MOCK.issue.damaged },
  { id: "shipping", label: P17_MOCK.issue.shippingProblem },
  { id: "other", label: P17_MOCK.issue.other },
] as const;

type IssueBottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
};

export function IssueBottomSheet({
  open,
  onOpenChange,
  selected,
  onSelect,
  onContinue,
}: IssueBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex max-h-[min(85dvh,520px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0D12] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg"
      >
        <div className="border-b border-primary/20 px-4 pb-3 pt-4 text-center" dir="rtl">
          <SheetTitle className="text-base font-bold text-white">{P17_MOCK.issue.title}</SheetTitle>
          <SheetDescription className="sr-only">{P17_MOCK.issue.title}</SheetDescription>
        </div>
        <div className="flex flex-col gap-2 px-4 py-3" dir="rtl">
          {ISSUE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={cn(P17_RADIO_ROW, selected === option.id && P17_RADIO_ROW_ACTIVE)}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  selected === option.id ? "border-primary bg-primary/25" : "border-zinc-600",
                )}
              >
                {selected === option.id ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">{option.label}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-primary/15 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]" dir="rtl">
          <p className="mb-3 text-center text-[11px] text-zinc-500">{P17_MOCK.issue.mockNote}</p>
          <button
            type="button"
            disabled={!selected}
            className={P17_PRIMARY_BTN}
            onClick={onContinue}
          >
            {P17_MOCK.issue.continue}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
