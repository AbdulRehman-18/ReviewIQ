import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SentimentLabel, FlaggedReview } from "./ModerationCard";

interface ModerationActionsProps {
  review: FlaggedReview;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onOverride?: (id: number, sentiment: SentimentLabel) => void;
}

const SENTIMENT_OPTIONS: { value: SentimentLabel; label: string }[] = [
  { value: "positive", label: "Positive" },
  { value: "neutral",  label: "Neutral"  },
  { value: "negative", label: "Negative" },
];

export function ModerationActions({ review, onApprove, onReject, onOverride }: ModerationActionsProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-4 flex-wrap">
      {/* Sentiment override */}
      <div className="flex items-center gap-2">
        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Override:</span>
        <Select
          defaultValue={review.aiGuess.sentiment}
          onValueChange={(val) => onOverride?.(review.id, val as SentimentLabel)}
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SENTIMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Approve / Reject */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/50"
          onClick={() => onReject?.(review.id)}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Reject
        </Button>
        <Button
          size="sm"
          className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => onApprove?.(review.id)}
        >
          <Check className="w-3.5 h-3.5 mr-1" />
          Approve
        </Button>
      </div>
    </div>
  );
}
