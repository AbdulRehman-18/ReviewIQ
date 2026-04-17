import { useState, useMemo } from "react";
import { ShieldCheck, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ModerationQueue, DUMMY_FLAGGED_REVIEWS } from "@/components/moderation/ModerationQueue";
import type { FlaggedReview } from "@/components/moderation/ModerationCard";

type FilterTab = "all" | "sarcasm" | "ambiguity";

export default function ModerationPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const stats = useMemo(() => {
    const total     = DUMMY_FLAGGED_REVIEWS.length;
    const sarcasm   = DUMMY_FLAGGED_REVIEWS.filter((r) => r.flagReason === "sarcasm").length;
    const ambiguous = DUMMY_FLAGGED_REVIEWS.filter((r) => r.flagReason === "ambiguity").length;
    const avgConf   = DUMMY_FLAGGED_REVIEWS.reduce((acc, r) => acc + r.aiGuess.confidence, 0) / total;
    return { total, sarcasm, ambiguous, avgConf };
  }, []);

  const filtered = useMemo<FlaggedReview[]>(() => {
    if (activeFilter === "all") return DUMMY_FLAGGED_REVIEWS;
    return DUMMY_FLAGGED_REVIEWS.filter((r) => r.flagReason === activeFilter);
  }, [activeFilter]);

  const tabCount = (filter: FilterTab) =>
    filter === "all"
      ? DUMMY_FLAGGED_REVIEWS.length
      : DUMMY_FLAGGED_REVIEWS.filter((r) => r.flagReason === filter).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Moderation Queue</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Review AI-flagged items — sarcasm and ambiguous sentiment detected by the pipeline.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 mt-1">
          {stats.total} pending
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Flagged"
          value={String(stats.total)}
          change="This batch"
          trend="neutral"
          icon={AlertTriangle}
          index={0}
        />
        <MetricCard
          label="Sarcasm Flags"
          value={String(stats.sarcasm)}
          change={`${Math.round((stats.sarcasm / stats.total) * 100)}% of queue`}
          trend="down"
          index={1}
        />
        <MetricCard
          label="Ambiguous Flags"
          value={String(stats.ambiguous)}
          change={`${Math.round((stats.ambiguous / stats.total) * 100)}% of queue`}
          trend="neutral"
          index={2}
        />
        <MetricCard
          label="Avg AI Confidence"
          value={`${Math.round(stats.avgConf * 100)}%`}
          change="Below threshold"
          trend="down"
          icon={CheckCircle}
          index={3}
        />
      </div>

      {/* Filter tabs + queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {tabCount("all")}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sarcasm">
                Sarcasm
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {tabCount("sarcasm")}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="ambiguity">
                Ambiguous
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {tabCount("ambiguity")}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Last updated: just now
          </div>
        </div>

        <ModerationQueue reviews={filtered} />
      </div>
    </div>
  );
}
