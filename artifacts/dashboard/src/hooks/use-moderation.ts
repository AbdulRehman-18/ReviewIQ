import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useIngest } from "@/contexts/IngestContext";
import { storage } from "@/lib/storage";
import type { FlaggedReview, SentimentLabel } from "@/components/moderation/ModerationCard";

interface ModerationDecision {
  id: number;
  action: "approved" | "rejected" | "override";
  sentiment?: SentimentLabel;
}

function buildFlaggedReviews(reviews: any[]): FlaggedReview[] {
  return reviews
    .filter((r) => r.is_sarcastic || r.overall_sentiment === "sarcastic" || r.overall_sentiment === "ambiguous")
    .map((r) => ({
      id: r.id,
      text: r.text,
      flagReason: (r.is_sarcastic || r.overall_sentiment === "sarcastic") ? "sarcasm" : "ambiguity",
      source: "Ingested Dataset",
      product: "Current Product",
      submittedAt: r.created_at ?? new Date().toISOString(),
      aiGuess: {
        sentiment: r.overall_sentiment as SentimentLabel,
        confidence: typeof r.sentiment_score === "number"
          ? Math.min(0.95, 0.45 + Math.abs(r.sentiment_score) * 0.03)
          : 0.52,
        aspects: r.features?.slice(0, 2).map((f: any) => f.feature) ?? ["General"],
      },
    }));
}

export function useModerationQueue() {
  const { data } = useIngest();

  const [decisions, setDecisions] = useState<Record<number, ModerationDecision>>(
    () => {
      const saved = storage.getModerationQueue<ModerationDecision>();
      return Object.fromEntries(saved.map((d) => [d.id, d]));
    }
  );

  const [overrides, setOverrides] = useState<Record<number, SentimentLabel>>({});

  // Persist decisions
  useEffect(() => {
    storage.setModerationQueue(Object.values(decisions));
  }, [decisions]);

  const allFlagged = useMemo(
    () => buildFlaggedReviews(data.reviews?.items ?? []),
    [data.reviews]
  );

  // Queue = flagged reviews that haven't been approved or rejected
  const queue = useMemo<FlaggedReview[]>(() => {
    return allFlagged
      .filter((r) => !decisions[r.id] || decisions[r.id].action === "override")
      .map((r) => {
        const override = overrides[r.id];
        if (override) {
          return { ...r, aiGuess: { ...r.aiGuess, sentiment: override } };
        }
        return r;
      });
  }, [allFlagged, decisions, overrides]);

  const approve = useCallback((id: number) => {
    setDecisions((prev) => ({ ...prev, [id]: { id, action: "approved" } }));
    toast({ title: "Review approved", description: "AI classification accepted and saved." });
  }, []);

  const reject = useCallback((id: number) => {
    setDecisions((prev) => ({ ...prev, [id]: { id, action: "rejected" } }));
    toast({ title: "Review rejected", description: "Item removed from the queue." });
  }, []);

  const override = useCallback((id: number, sentiment: SentimentLabel) => {
    setOverrides((prev) => ({ ...prev, [id]: sentiment }));
    setDecisions((prev) => ({ ...prev, [id]: { id, action: "override", sentiment } }));
    toast({ title: "Sentiment overridden", description: `Saved as "${sentiment}".` });
  }, []);

  return { queue, approve, reject, override };
}
