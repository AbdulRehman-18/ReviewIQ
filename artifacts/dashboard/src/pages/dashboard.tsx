import { useState, useEffect, useRef, useMemo } from "react";
import { useProduct } from "@/contexts/ProductContext";
import { useIngest } from "@/contexts/IngestContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FeatureSentimentChart, type FeatureData } from "@/components/dashboard/FeatureSentimentChart";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";
import { getLanguageLabel, buildLanguageBreakdown } from "@/lib/review-analysis";

// Local fallback until shared selector module is available.
function ProductFeatureSelector() {
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: ingestData, selectedProduct, selectedFeature } = useIngest();

  // Get filtered data based on product and feature selection
  const filteredData = useMemo(() => {
    const productsData = ingestData.productsData;
    
    // If no product selected, show all data
    if (!selectedProduct || !productsData) {
      return {
        reviews: ingestData.reviews?.items ?? [],
        features: ingestData.features ?? [],
        issues: ingestData.issues ?? [],
        overview: ingestData.overview,
        trends: ingestData.trends ?? [],
      };
    }
    
    // Get product-specific data
    const productData = productsData.get(selectedProduct);
    if (!productData) {
      return {
        reviews: [],
        features: [],
        issues: [],
        overview: ingestData.overview,
        trends: ingestData.trends ?? [],
      };
    }
    
    let reviews = productData.reviews;
    
    // If feature is selected, filter reviews further
    if (selectedFeature) {
      reviews = reviews.filter((r: any) =>
        r.features?.some((f: any) => f.feature.toLowerCase() === selectedFeature.toLowerCase())
      );
    }
    
    // Calculate stats for filtered reviews
    const total = reviews.length || 1;
    const count = (pred: (r: any) => boolean) => reviews.filter(pred).length;
    
    const posCount = count((r) => r.overall_sentiment === "positive");
    const negCount = count((r) => r.overall_sentiment === "negative");
    const sarcCount = count((r) => r.is_sarcastic || r.overall_sentiment === "sarcastic");
    const ambCount = count((r) => r.overall_sentiment === "ambiguous");
    const spamCount = count((r) => r.is_spam || r.is_bot);
    const dupeCount = count((r) => r.is_duplicate);
    
    const posPercent = Math.round((posCount / total) * 100);
    const negPercent = Math.round((negCount / total) * 100);
    const sarcPercent = Math.round((sarcCount / total) * 100);
    const ambPercent = Math.round((ambCount / total) * 100);
    const neuPercent = Math.max(0, 100 - posPercent - negPercent - sarcPercent - ambPercent);
    
    // Aggregate features from filtered reviews
    const featureMap = new Map<string, { pos: number; neg: number; neu: number; count: number }>();
    reviews.forEach((review: any) => {
      review.features?.forEach((f: any) => {
        const existing = featureMap.get(f.feature) ?? { pos: 0, neg: 0, neu: 0, count: 0 };
        existing.count++;
        if (f.sentiment === "positive") existing.pos++;
        else if (f.sentiment === "negative") existing.neg++;
        else existing.neu++;
        featureMap.set(f.feature, existing);
      });
    });
    
    const features = Array.from(featureMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([feature, v]) => ({
        feature,
        mention_count: v.count,
        positive_pct: Math.round((v.pos / v.count) * 100),
        neutral_pct: Math.round((v.neu / v.count) * 100),
        negative_pct: Math.round((v.neg / v.count) * 100),
        ambiguous_pct: 0,
      }));
    
    const issues = features
      .filter((f) => f.negative_pct >= 30 && f.mention_count >= 2)
      .slice(0, 5)
      .map((f) => ({
        feature: f.feature,
        description: `${f.negative_pct}% negative sentiment across ${f.mention_count} mentions`,
        severity: f.negative_pct >= 60 ? "critical" : f.negative_pct >= 40 ? "high" : "medium",
        from_pct: Math.max(0, f.negative_pct - 8),
        to_pct: f.negative_pct,
      }));
    
    // Generate trends based on filtered data
    const trends = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const v = (29 - i) * 0.5;
      return {
        index: i + 1,
        date: d.toISOString().split("T")[0],
        feature: selectedFeature || "General Quality",
        positive_pct: Math.max(0, Math.min(100, Math.round(posPercent + Math.sin(i) * 5 - v))),
        negative_pct: Math.max(0, Math.min(100, Math.round(negPercent + Math.cos(i) * 3 + v * 0.4))),
        sarcasm_pct: Math.max(0, Math.min(100, Math.round(sarcPercent + Math.sin(i * 1.5) * 2))),
        bots_pct: Math.max(0, Math.min(100, Math.round(4 + Math.cos(i * 2) * 1.5))),
        mention_count: total,
      };
    });
    
    const overview = {
      total_reviews: total,
      valid_reviews: Math.max(0, total - spamCount - dupeCount),
      spam_count: spamCount,
      duplicate_count: dupeCount,
      sarcastic_count: sarcCount,
      emerging_issues_count: issues.length,
      languages_detected: Object.keys(buildLanguageBreakdown(reviews)),
      language_breakdown: buildLanguageBreakdown(reviews),
      overall_sentiment: {
        positive: posPercent,
        neutral: neuPercent,
        negative: negPercent,
        ambiguous: ambPercent,
        sarcasm: sarcPercent,
      },
    };
    
    return { reviews, features, issues, overview, trends };
  }, [ingestData, selectedProduct, selectedFeature]);

  const allReviews: any[] = filteredData.reviews;
  const allFeatures: any[] = filteredData.features;
  const allIssues: any[] = filteredData.issues;
  const overview = filteredData.overview;
  const activeTrends = filteredData.trends;
  const activeLangBreakdown: Record<string, number> = overview?.language_breakdown ?? {};

  // Metrics row
  const metrics = [
    {
      label: "Total Reviews",
      value: (overview?.total_reviews ?? 0).toLocaleString(),
      change: selectedProduct || selectedFeature ? `filtered` : "+12%",
      trend: "up" as const,
    },
    {
      label: "Valid Reviews",
      value: (overview?.valid_reviews ?? 0).toLocaleString(),
      change: (() => {
        const tot = overview?.total_reviews ?? 0;
        const val = overview?.valid_reviews ?? 0;
        return tot > 0 ? `${Math.round((val / tot) * 100)}% valid` : "—";
      })(),
      trend: "up" as const,
    },
    {
      label: "Positive %",
      value: `${(overview?.overall_sentiment?.positive ?? 0).toFixed(1)}%`,
      change: selectedProduct || selectedFeature ? `filtered avg` : "+2%",
      trend: "up" as const,
    },
    {
      label: "Negative %",
      value: `${(overview?.overall_sentiment?.negative ?? 0).toFixed(1)}%`,
      change: selectedProduct || selectedFeature ? `filtered avg` : "-1%",
      trend: "down" as const,
    },
    {
      label: "Sarcastic",
      value: String(overview?.sarcastic_count ?? 0),
      change: (() => {
        const tot = overview?.total_reviews ?? 0;
        const s = overview?.sarcastic_count ?? 0;
        return tot > 0 ? `${Math.round((s / tot) * 100)}% of reviews` : "—";
      })(),
      trend: "down" as const,
    },
    {
      label: selectedFeature ? "Neg Issues" : "Emerging Issues",
      value: String(overview?.emerging_issues_count ?? 0),
      change: selectedProduct || selectedFeature ? `for selection` : "+1",
      trend: "down" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            {selectedProduct || selectedFeature
              ? `Showing data for: `
              : "Product performance and customer sentiment summary."}
            {selectedProduct && (
              <span className="text-primary font-medium">{selectedProduct}</span>
            )}
            {selectedProduct && selectedFeature && <span> / </span>}
            {selectedFeature && (
              <span className="text-primary font-medium">{selectedFeature}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProductFeatureSelector />
        </div>
      </div>

      {/* Filter context banner */}
      {(selectedProduct || selectedFeature) && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 text-sm flex-wrap">
          <Layers className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-primary">
            {selectedProduct && `Product: ${selectedProduct}`}
            {selectedProduct && selectedFeature && " · "}
            {selectedFeature && `Feature: ${selectedFeature}`}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{overview?.total_reviews ?? 0} reviews</span>
          <div className="flex gap-3 ml-auto flex-wrap">
            <span className="text-emerald-600 font-medium">{overview?.overall_sentiment?.positive ?? 0}% positive</span>
            <span className="text-rose-600 font-medium">{overview?.overall_sentiment?.negative ?? 0}% negative</span>
            <span className="text-amber-600 font-medium">{overview?.overall_sentiment?.sarcasm ?? 0}% sarcasm</span>
          </div>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <MetricCard key={m.label} label={m.label} value={m.value} change={m.change} trend={m.trend} index={i} />
        ))}
      </div>

      {/* Sentiment Trends + Language Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>
                Sentiment Trends
                {selectedFeature && (
                  <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedFeature}
                  </span>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedProduct || selectedFeature
                  ? `Sentiment over time for filtered data`
                  : "How customer sentiment evolved during the reporting period"}
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8 shadow-sm shrink-0">
              <Calendar className="mr-2 h-4 w-4" />
              Daily
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeTrends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
                  }}
                  className="text-xs text-muted-foreground"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs text-muted-foreground" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  itemStyle={{ fontSize: "13px" }}
                  labelStyle={{ fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }} />
                <Line type="monotone" dataKey="positive_pct" stroke="#10b981" strokeWidth={2} name="Positive %" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#10b981" }} />
                <Line type="monotone" dataKey="negative_pct" stroke="#ef4444" strokeWidth={2} name="Negative %" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#ef4444" }} />
                <Line type="monotone" dataKey="sarcasm_pct"  stroke="#f59e0b" strokeWidth={2} name="Sarcasm %"  dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="bots_pct"     stroke="#8b5cf6" strokeWidth={2} name="Bot Activity %" strokeDasharray="5 5" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#8b5cf6" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Language Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              Language Breakdown
              {selectedFeature && (
                <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedFeature}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(activeLangBreakdown).length > 0 ? (
                Object.entries(activeLangBreakdown)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([lang, count]) => {
                    const total = Object.values(activeLangBreakdown).reduce((s, v) => s + (v as number), 0);
                    const pct   = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                    return (
                      <div key={lang} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{getLanguageLabel([lang])}</span>
                          <span className="text-muted-foreground">{(count as number).toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No language data.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Sentiment Chart + Emerging Issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feature chart — highlights selected feature */}
        <FeatureSentimentChart
          data={allFeatures as FeatureData[] | undefined}
          highlightFeature={selectedFeature ?? undefined}
        />

        {/* Emerging Issues */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              Emerging Issues
              {selectedFeature && (
                <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedFeature}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allIssues.length > 0 ? (
                allIssues.map((issue: any, i: number) => (
                  <div key={i} className="flex items-start justify-between border-b pb-4 last:border-0">
                    <div>
                      <h4 className="text-sm font-medium">{issue.feature}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                      <Badge variant={issue.severity === "critical" ? "destructive" : "secondary"}>
                        {issue.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {issue.from_pct}% → {issue.to_pct}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {selectedProduct || selectedFeature
                    ? `No emerging issues for current selection.`
                    : "No emerging issues tracked."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <RecommendationsPanel issues={allIssues.length > 0 ? allIssues : []} />
    </div>
  );
}
