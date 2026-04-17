import { useProduct } from "@/contexts/ProductContext";
import { useIngest } from "@/contexts/IngestContext";
import { useGetProductReviews, getGetProductReviewsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLanguageLabel } from "@/lib/review-analysis";
import { Search, UploadCloud, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

// ─── SVG gauge helpers ──────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function scoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function LargeGauge({ score }: { score: number }) {
  const cx = 100, cy = 100, r = 72;
  const start = 135, span = 270;
  const fillEnd = start + (Math.min(score, 100) / 100) * span;
  const dot = polarToCartesian(cx, cy, r, fillEnd);
  const color = scoreColor(score);
  return (
    <svg viewBox="0 0 200 175" className="w-44 h-36">
      <path d={arcPath(cx, cy, r, start, start + span)} fill="none" stroke="#e5e7eb" strokeWidth={10} strokeLinecap="round" />
      {score > 0 && <path d={arcPath(cx, cy, r, start, fillEnd)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />}
      {score > 0 && <circle cx={dot.x} cy={dot.y} r={7} fill="white" stroke={color} strokeWidth={3} />}
      <text x={cx} y={cx + 12} textAnchor="middle" fontSize="34" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

function MiniGauge({ score, size = 50 }: { score: number; size?: number }) {
  const sw = 5;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(score, 100) / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      {score > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${filled.toFixed(2)} ${(circ - filled).toFixed(2)}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

// ─── Filter helpers ──────────────────────────────────────────────────────────

type ReviewFilter = "all" | "positive" | "negative" | "neutral" | "sarcastic" | "ambiguous" | "bot" | "duplicates";

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: "all",        label: "All"         },
  { value: "positive",   label: "Positive"    },
  { value: "negative",   label: "Negative"    },
  { value: "neutral",    label: "Neutral"     },
  { value: "sarcastic",  label: "Sarcastic"   },
  { value: "ambiguous",  label: "Ambiguous"   },
  { value: "bot",        label: "Bot/Spam"    },
  { value: "duplicates", label: "Duplicates"  },
];

const LANG_CHIPS = ["EN", "FR", "DE", "ES", "HI"];

function getReviewLanguages(review: any): string[] {
  if (Array.isArray(review.languages) && review.languages.length) return review.languages;
  if (typeof review.language === "string")
    return review.language.split(/[,+/]/).map((s: string) => s.trim()).filter(Boolean);
  return [];
}

function matchesFilter(review: any, filter: ReviewFilter) {
  switch (filter) {
    case "positive": case "negative": case "neutral": return review.overall_sentiment === filter;
    case "sarcastic": return review.is_sarcastic || review.overall_sentiment === "sarcastic";
    case "ambiguous": return review.overall_sentiment === "ambiguous";
    case "bot":        return review.is_bot || review.is_spam;
    case "duplicates": return review.is_duplicate;
    default: return true;
  }
}

function sentimentPillClass(s: string) {
  if (s === "positive") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "negative") return "bg-rose-100 text-rose-700 border-rose-200";
  if (s === "sarcastic" || s === "sarcasm") return "bg-amber-100 text-amber-700 border-amber-200";
  if (s === "ambiguous") return "bg-violet-100 text-violet-700 border-violet-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function impactClass(impact: string) {
  if (impact === "High Impact")     return "bg-rose-100 text-rose-700 border-rose-200";
  if (impact === "Moderate Impact") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

// ─── Review Drawer ───────────────────────────────────────────────────────────

function highlightKeywords(text: string, sentiment: string) {
  const keywords = ["dissolve", "clean", "scent", "packaging", "burst", "rash", "reaction", "quality", "love", "hate", "broken", "fast", "slow"];
  const color = sentiment === "positive" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
  const regex = new RegExp(`(${keywords.join("|")})`, "gi");
  return text.replace(regex, `<mark class="rounded px-0.5 font-medium ${color}">$1</mark>`);
}

function ReviewDrawer({ review, onClose }: { review: any; onClose: () => void }) {
  const langs = getReviewLanguages(review);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] max-w-full bg-background border-l border-border z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-[15px]">Review Detail</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Review text */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Review</p>
              <p
                className="text-[13.5px] leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: highlightKeywords(review.text, review.overall_sentiment) }}
              />
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${sentimentPillClass(review.overall_sentiment)}`}>
                  {review.overall_sentiment}
                </span>
                {review.is_sarcastic && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
                    sarcasm
                  </span>
                )}
                {(review.is_bot || review.is_spam) && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
                    bot
                  </span>
                )}
                {review.is_duplicate && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-purple-100 text-purple-600 border-purple-200">
                    duplicate
                  </span>
                )}
                {langs.map(l => (
                  <span key={l} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                    {l.toUpperCase()}
                  </span>
                ))}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""} · #{review.id}
                </span>
              </div>
            </div>

            {/* Feature sentiment */}
            {review.features && review.features.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Feature Sentiment
                </p>
                <div className="space-y-3">
                  {review.features.map((f: any) => {
                    const pct = Math.round((f.confidence ?? 0.75) * 100);
                    return (
                      <div key={f.feature} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-medium">{f.feature}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{pct}%</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sentimentPillClass(f.sentiment)}`}>
                              {f.sentiment}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              f.sentiment === "positive" ? "bg-emerald-500" :
                              f.sentiment === "negative" ? "bg-rose-500"    : "bg-zinc-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Duplicate notice */}
            {review.is_duplicate && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-[12.5px] text-purple-700">
                Part of a cluster of near-duplicate reviews detected in the last 7 days.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const [, setLocation] = useLocation();
  const { selectedProductId } = useProduct();
  const { data: ingestData } = useIngest();
  const [filter, setFilter]       = useState<ReviewFilter>("all");
  const [searchQuery, setSearch]  = useState("");
  const [activeLangs, setActiveLangs] = useState<Set<string>>(new Set());
  const [selectedReview, setSelectedReview] = useState<any>(null);

  const isMock = import.meta.env.VITE_USE_MOCK_API === "true" || !selectedProductId;
  const { data: apiData, isLoading } = useGetProductReviews(selectedProductId!, {}, {
    query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductReviewsQueryKey(selectedProductId!, {}) },
  });

  const baseData   = apiData || ingestData?.reviews;
  const allItems   = useMemo(() => baseData?.items || [], [baseData]);
  const overview   = ingestData?.overview;

  // Score computation
  const pos      = overview?.overall_sentiment?.positive ?? 0;
  const neg      = overview?.overall_sentiment?.negative ?? 0;
  const sarc     = overview?.overall_sentiment?.sarcasm  ?? 0;
  const amb      = overview?.overall_sentiment?.ambiguous ?? 0;
  const total    = overview?.total_reviews  ?? 0;
  const valid    = overview?.valid_reviews  ?? 0;
  const validPct = total > 0 ? Math.round((valid / total) * 100) : 0;
  const toneScore = Math.max(0, Math.round(100 - sarc - amb));
  const overallScore = total > 0
    ? Math.round(pos * 0.45 + validPct * 0.25 + toneScore * 0.15 + Math.max(0, 100 - neg) * 0.15)
    : 0;

  const statusLabel = overallScore >= 75 ? "Excellent" : overallScore >= 55 ? "Good" : overallScore >= 35 ? "To improve" : "Needs attention";
  const statusClass =
    overallScore >= 75 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    overallScore >= 55 ? "bg-blue-100 text-blue-700 border-blue-200"          :
    overallScore >= 35 ? "bg-amber-100 text-amber-700 border-amber-200"        :
    "bg-rose-100 text-rose-700 border-rose-200";

  const categories = [
    {
      label: "Positive Sentiment",
      description: pos >= 50 ? "Strong positive customer reception" : "Positive feedback below target",
      score: Math.round(pos),
      impact: pos >= 60 ? "Low Impact" : pos >= 35 ? "Moderate Impact" : "High Impact",
    },
    {
      label: "Issue Rate",
      description: neg <= 20 ? "Low volume of negative complaints" : "Elevated rate of negative feedback",
      score: Math.max(0, Math.round(100 - neg)),
      impact: neg >= 40 ? "High Impact" : neg >= 20 ? "Moderate Impact" : "Low Impact",
    },
    {
      label: "Authenticity",
      description: validPct >= 80 ? "High ratio of genuine reviews" : "Spam or duplicate activity detected",
      score: validPct,
      impact: validPct >= 80 ? "Low Impact" : validPct >= 55 ? "Moderate Impact" : "High Impact",
    },
    {
      label: "Tone Quality",
      description: sarc <= 10 ? "Natural tone across reviews" : "Sarcasm or mixed signals detected",
      score: toneScore,
      impact: sarc >= 20 ? "High Impact" : sarc >= 8 ? "Moderate Impact" : "Low Impact",
    },
  ];

  function toggleLang(lang: string) {
    setActiveLangs(prev => {
      const next = new Set(prev);
      next.has(lang) ? next.delete(lang) : next.add(lang);
      return next;
    });
  }

  const filteredItems = useMemo(() => {
    let items = allItems.filter((r: any) => matchesFilter(r, filter));
    if (activeLangs.size > 0) {
      items = items.filter((r: any) => {
        const langs = getReviewLanguages(r).map((l: string) => l.toUpperCase());
        return langs.some(l => activeLangs.has(l));
      });
    }
    if (searchQuery) {
      const lq = searchQuery.toLowerCase();
      items = items.filter((r: any) =>
        [r.text, r.overall_sentiment, ...(r.features || []).map((f: any) => f.feature)]
          .join(" ").toLowerCase().includes(lq)
      );
    }
    return items;
  }, [allItems, filter, activeLangs, searchQuery]);

  const filterCounts = useMemo(() =>
    FILTERS.reduce<Record<ReviewFilter, number>>((acc, f) => {
      acc[f.value] = allItems.filter((r: any) => matchesFilter(r, f.value)).length;
      return acc;
    }, {} as Record<ReviewFilter, number>),
    [allItems]
  );

  const hasData = total > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Reviews Queue</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {allItems.length} reviews loaded
        </p>
      </div>

      {/* ── Score card (Sternify style) ── */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-5">
          {hasData ? (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Gauge */}
              <div className="flex flex-col items-center min-w-[176px] pt-1">
                <LargeGauge score={overallScore} />
                <p className="text-[13px] font-semibold -mt-1">Review Score</p>
                <span className={`mt-2.5 text-[11px] font-semibold px-3 py-1 rounded-full border ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Categories */}
              <div className="flex-1 space-y-2 w-full">
                {categories.map(cat => (
                  <div
                    key={cat.label}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/35 transition-colors"
                  >
                    <MiniGauge score={cat.score} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13px]">{cat.label}</p>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                    </div>
                    <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${impactClass(cat.impact)}`}>
                      {cat.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <UploadCloud className="w-10 h-10 opacity-25" />
              <p className="text-[14px] font-medium">No data ingested yet</p>
              <p className="text-[13px]">
                Go to{" "}
                <button className="underline text-primary" onClick={() => setLocation("/ingest")}>
                  Ingestion
                </button>{" "}
                to upload or paste customer reviews.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Reviews table ── */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {/* Filter tabs */}
          <div className="px-4 pt-4 pb-0 border-b border-border/50">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as ReviewFilter)}>
              <TabsList className="h-auto flex-wrap justify-start gap-1.5 bg-transparent p-0 mb-0">
                {FILTERS.map(f => (
                  <TabsTrigger
                    key={f.value} value={f.value}
                    className="group gap-1 rounded-t-md border-b-2 border-transparent bg-transparent px-3 py-2 text-[12.5px] font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {f.label}
                    <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-muted/70 px-1 text-[10px] font-medium text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                      {filterCounts[f.value] ?? 0}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Search + language chips */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 flex-wrap">
            <div className="relative w-64 group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search reviews…"
                className="pl-8 h-8 text-[12.5px] rounded-lg bg-muted/30 border-border/40"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 ml-1">
              {LANG_CHIPS.map(lang => (
                <button
                  key={lang}
                  onClick={() => toggleLang(lang)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    activeLangs.has(lang)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border/60 hover:bg-muted/50"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[11.5px] font-semibold text-muted-foreground w-[90px]">Date</TableHead>
                  <TableHead className="text-[11.5px] font-semibold text-muted-foreground">Review</TableHead>
                  <TableHead className="text-[11.5px] font-semibold text-muted-foreground w-[70px]">Lang</TableHead>
                  <TableHead className="text-[11.5px] font-semibold text-muted-foreground w-[130px]">Sentiment</TableHead>
                  <TableHead className="text-[11.5px] font-semibold text-muted-foreground w-[140px]">Features</TableHead>
                  <TableHead className="text-[11.5px] font-semibold text-muted-foreground w-[100px]">Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-[13px]">
                      Loading reviews…
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((review: any) => (
                    <TableRow
                      key={review.id}
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => setSelectedReview(review)}
                    >
                      <TableCell className="text-[11.5px] text-muted-foreground whitespace-nowrap">
                        {review.created_at ? new Date(review.created_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="min-w-[280px] max-w-md">
                        <p className="text-[13px] leading-snug line-clamp-2">{review.text}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getReviewLanguages(review).map((lang: string) => (
                            <span
                              key={lang}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted/50 text-muted-foreground border-border/50"
                              title={getLanguageLabel([lang])}
                            >
                              {lang.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${sentimentPillClass(review.overall_sentiment)}`}>
                          {review.overall_sentiment}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {review.features?.slice(0, 2).map((f: any, i: number) => (
                            <span key={i} className="text-[10.5px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                              {f.feature}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {review.is_sarcastic && (
                            <Badge variant="outline" className="text-[9.5px] px-1.5 h-4 border-amber-300 text-amber-600">sarcasm</Badge>
                          )}
                          {(review.is_bot || review.is_spam) && (
                            <Badge variant="outline" className="text-[9.5px] px-1.5 h-4 border-slate-300 text-slate-500">spam</Badge>
                          )}
                          {review.is_duplicate && (
                            <Badge variant="outline" className="text-[9.5px] px-1.5 h-4 border-purple-300 text-purple-600">dupe</Badge>
                          )}
                          {!review.is_sarcastic && !review.is_bot && !review.is_spam && !review.is_duplicate && (
                            <span className="text-[11px] text-muted-foreground/40">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <span className="text-3xl opacity-30">🔍</span>
                        <p className="text-[13.5px] font-medium">No reviews found</p>
                        <p className="text-[12px]">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Review Drawer ── */}
      {selectedReview && (
        <ReviewDrawer review={selectedReview} onClose={() => setSelectedReview(null)} />
      )}
    </div>
  );
}
