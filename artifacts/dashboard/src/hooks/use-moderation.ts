import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import type { FlaggedReview, SentimentLabel } from "@/components/moderation/ModerationCard";
import { DUMMY_FLAGGED_REVIEWS } from "@/components/moderation/ModerationQueue";

export function useModerationQueue(initialReviews: FlaggedReview[] = DUMMY_FLAGGED_REVIEWS) {
  const [queue, setQueue] = useState<FlaggedReview[]>(initialReviews);

  const approve = useCallback((id: number) => {
    setQueue((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Review approved", description: "AI classification accepted and saved." });
  }, []);

  const reject = useCallback((id: number) => {
    setQueue((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Review rejected", description: "Item removed from the queue." });
  }, []);

  const override = useCallback((id: number, sentiment: SentimentLabel) => {
    setQueue((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, aiGuess: { ...r.aiGuess, sentiment } } : r
      )
    );
    toast({ title: "Sentiment overridden", description: `Saved as "${sentiment}".` });
  }, []);

  return { queue, approve, reject, override };
}
