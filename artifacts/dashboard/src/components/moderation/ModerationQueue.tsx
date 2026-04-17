import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ModerationCard, type FlaggedReview, type SentimentLabel } from "./ModerationCard";
import { ModerationActions } from "./ModerationActions";

export const DUMMY_FLAGGED_REVIEWS: FlaggedReview[] = [
  {
    id: 1,
    text: "Yeah right, the battery lasts FOREVER... if forever means 2 hours. Totally worth the price. 👍",
    flagReason: "sarcasm",
    source: "Amazon",
    product: "Wireless Earbuds Pro",
    submittedAt: "2026-04-15T09:23:00Z",
    aiGuess: { sentiment: "positive", confidence: 0.52, aspects: ["Battery Life", "Value"] },
  },
  {
    id: 2,
    text: "It's not bad, I guess. Works sometimes. The delivery was... interesting.",
    flagReason: "ambiguity",
    source: "Shopify",
    product: "Smart Watch Ultra",
    submittedAt: "2026-04-15T11:05:00Z",
    aiGuess: { sentiment: "neutral", confidence: 0.48, aspects: ["Delivery", "General"] },
  },
  {
    id: 3,
    text: "The packaging is art. Pure art. Shakespeare himself would weep at such craftsmanship.",
    flagReason: "sarcasm",
    source: "Trustpilot",
    product: "Wireless Earbuds Pro",
    submittedAt: "2026-04-15T13:40:00Z",
    aiGuess: { sentiment: "positive", confidence: 0.44, aspects: ["Packaging"] },
  },
  {
    id: 4,
    text: "Could be better. Could also be worse. It exists. That's something.",
    flagReason: "ambiguity",
    source: "Amazon",
    product: "Smart Watch Ultra",
    submittedAt: "2026-04-15T15:12:00Z",
    aiGuess: { sentiment: "neutral", confidence: 0.41, aspects: ["General"] },
  },
];

interface ModerationQueueProps {
  reviews?: FlaggedReview[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onOverride?: (id: number, sentiment: SentimentLabel) => void;
}

export function ModerationQueue({
  reviews = DUMMY_FLAGGED_REVIEWS,
  onApprove,
  onReject,
  onOverride,
}: ModerationQueueProps) {
  if (reviews.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Inbox className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Queue is empty</p>
        <p className="text-xs text-muted-foreground/70">All flagged reviews have been reviewed.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review, i) => (
        <Card key={review.id} className="overflow-hidden">
          <ModerationCard review={review} index={i} />
          <Separator />
          <ModerationActions
            review={review}
            onApprove={onApprove}
            onReject={onReject}
            onOverride={onOverride}
          />
        </Card>
      ))}
    </div>
  );
}
