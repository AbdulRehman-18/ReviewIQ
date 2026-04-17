import { AlertTriangle, Zap, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export type FlagReason = "sarcasm" | "ambiguity";
export type SentimentLabel = "positive" | "negative" | "neutral";

export interface AiGuess {
  sentiment: SentimentLabel;
  confidence: number;
  aspects: string[];
}

export interface FlaggedReview {
  id: number;
  text: string;
  flagReason: FlagReason;
  source: string;
  product: string;
  submittedAt: string;
  aiGuess: AiGuess;
}

const FLAG_CONFIG: Record<FlagReason, { label: string; color: string; Icon: typeof AlertTriangle }> = {
  sarcasm:   { label: "Sarcasm Detected",    color: "text-amber-500",  Icon: Zap          },
  ambiguity: { label: "Ambiguous Sentiment", color: "text-blue-500",   Icon: AlertTriangle },
};

const SENTIMENT_BADGE: Record<SentimentLabel, string> = {
  positive: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  negative: "bg-rose-500/15 text-rose-600 border-rose-500/25",
  neutral:  "bg-muted text-muted-foreground border-border",
};

interface ModerationCardProps {
  review: FlaggedReview;
  index?: number;
}

export function ModerationCard({ review, index = 0 }: ModerationCardProps) {
  const flag = FLAG_CONFIG[review.flagReason];
  const FlagIcon = flag.Icon;
  const confidencePct = Math.round(review.aiGuess.confidence * 100);
  const confidenceColor =
    confidencePct >= 70 ? "bg-emerald-500" : confidencePct >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.07 }}
      className="p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FlagIcon className={`w-4 h-4 ${flag.color}`} />
          <span className={`text-xs font-semibold ${flag.color}`}>{flag.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{review.source}</span>
          <span>·</span>
          <span>{new Date(review.submittedAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </div>
      </div>

      {/* Review text */}
      <blockquote className="text-sm leading-relaxed border-l-2 border-border pl-3 italic text-foreground/80">
        "{review.text}"
      </blockquote>

      {/* Product */}
      <div className="text-xs text-muted-foreground">
        Product: <span className="font-medium text-foreground">{review.product}</span>
      </div>

      {/* AI analysis */}
      <div className="rounded-md bg-muted/50 border border-border p-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">AI Analysis</p>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Sentiment:</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SENTIMENT_BADGE[review.aiGuess.sentiment]}`}>
              {review.aiGuess.sentiment}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${confidenceColor}`}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
              <span className="text-xs font-medium">{confidencePct}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Aspects:</span>
          {review.aiGuess.aspects.map((aspect) => (
            <Badge key={aspect} variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
              {aspect}
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
