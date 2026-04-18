import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIngest } from "@/contexts/IngestContext";
import { UploadCloud, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function DeltaBadge({ a, b }: { a: number; b: number }) {
  const delta = b - a;
  if (Math.abs(delta) < 1) return <span className="text-muted-foreground text-xs">—</span>;
  const isPositive = delta < 0; // lower negative % is better
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
      {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
    </span>
  );
}

function SentimentBar({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) {
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden min-w-[80px]">
      <div className="bg-emerald-500" style={{ width: `${positive}%` }} />
      <div className="bg-slate-300" style={{ width: `${neutral}%` }} />
      <div className="bg-rose-500" style={{ width: `${negative}%` }} />
    </div>
  );
}

export default function ComparePage() {
  const { products, productsMap } = useIngest();
  const [, setLocation] = useLocation();

  const [product1Id, setProduct1Id] = useState<string>(() =>
    products.length > 0 ? String(products[0].id) : ""
  );
  const [product2Id, setProduct2Id] = useState<string>(() =>
    products.length > 1 ? String(products[1].id) : ""
  );

  const p1 = useMemo(() => productsMap[Number(product1Id)] ?? null, [productsMap, product1Id]);
  const p2 = useMemo(() => productsMap[Number(product2Id)] ?? null, [productsMap, product2Id]);

  const p1Name = products.find((p) => String(p.id) === product1Id)?.name ?? "Product 1";
  const p2Name = products.find((p) => String(p.id) === product2Id)?.name ?? "Product 2";

  // Merge features from both products for comparison table
  const allFeatureNames = useMemo(() => {
    const names = new Set<string>();
    (p1?.features ?? []).forEach((f: any) => names.add(f.feature));
    (p2?.features ?? []).forEach((f: any) => names.add(f.feature));
    return Array.from(names).sort();
  }, [p1, p2]);

  // Build chart data for sentiment overview comparison
  const sentimentChartData = useMemo(() => {
    const metrics = ["positive", "negative", "neutral", "sarcasm", "ambiguous"] as const;
    return metrics.map((key) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      [p1Name]: p1?.overview?.overall_sentiment?.[key] ?? 0,
      [p2Name]: p2?.overview?.overall_sentiment?.[key] ?? 0,
    }));
  }, [p1, p2, p1Name, p2Name]);

  const hasData = products.length > 0;
  const canCompare = !!p1 && !!p2 && product1Id !== product2Id;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compare Products</h1>
          <p className="text-muted-foreground">Compare features and sentiment across multiple datasets.</p>
        </div>
        <Card className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <UploadCloud className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-base font-medium text-muted-foreground">No datasets available</p>
          <p className="text-sm text-muted-foreground/70">
            Go to{" "}
            <button className="underline text-primary" onClick={() => setLocation("/ingest")}>
              Ingestion
            </button>{" "}
            and ingest at least two datasets to compare them.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compare Products</h1>
          <p className="text-muted-foreground">Compare features and sentiment across multiple datasets.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={product1Id} onValueChange={setProduct1Id}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select dataset 1" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={product2Id} onValueChange={setProduct2Id}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select dataset 2" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {products.length < 2 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-sm text-amber-700">
              You only have one dataset. Ingest another dataset from the{" "}
              <button className="underline font-medium" onClick={() => setLocation("/ingest")}>
                Ingestion page
              </button>{" "}
              to enable comparison.
            </p>
          </CardContent>
        </Card>
      )}

      {canCompare && (
        <>
          {/* Overview KPI comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Reviews",  v1: p1.overview.total_reviews,   v2: p2.overview.total_reviews,   fmt: (n: number) => n.toLocaleString() },
              { label: "Valid Reviews",  v1: p1.overview.valid_reviews,    v2: p2.overview.valid_reviews,    fmt: (n: number) => n.toLocaleString() },
              { label: "Positive %",    v1: p1.overview.overall_sentiment.positive, v2: p2.overview.overall_sentiment.positive, fmt: (n: number) => `${n.toFixed(0)}%` },
              { label: "Negative %",    v1: p1.overview.overall_sentiment.negative, v2: p2.overview.overall_sentiment.negative, fmt: (n: number) => `${n.toFixed(0)}%` },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{item.label}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate">{p1Name}</span>
                      <span className="text-sm font-bold">{item.fmt(item.v1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate">{p2Name}</span>
                      <span className="text-sm font-bold">{item.fmt(item.v2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sentiment distribution chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Distribution Comparison</CardTitle>
              <CardDescription>Side-by-side sentiment breakdown for each dataset</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey={p1Name} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey={p2Name} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Feature comparison matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Comparison Matrix</CardTitle>
              <CardDescription>Sentiment breakdown per feature across both datasets</CardDescription>
            </CardHeader>
            <CardContent>
              {allFeatureNames.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No feature data available. Use OpenRouter analysis during ingestion to extract features.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">Feature</TableHead>
                        <TableHead className="font-semibold">{p1Name} — Sentiment</TableHead>
                        <TableHead className="font-semibold">{p2Name} — Sentiment</TableHead>
                        <TableHead className="font-semibold text-rose-600">Neg% Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allFeatureNames.map((featureName) => {
                        const f1 = (p1.features as any[]).find((f) => f.feature === featureName);
                        const f2 = (p2.features as any[]).find((f) => f.feature === featureName);
                        return (
                          <TableRow key={featureName} className="hover:bg-muted/20">
                            <TableCell className="font-medium text-sm">{featureName}</TableCell>
                            <TableCell>
                              {f1 ? (
                                <div className="space-y-1">
                                  <SentimentBar
                                    positive={f1.positive_pct ?? 0}
                                    negative={f1.negative_pct ?? 0}
                                    neutral={f1.neutral_pct ?? 0}
                                  />
                                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                                    <span className="text-emerald-600">{(f1.positive_pct ?? 0).toFixed(0)}%+</span>
                                    <span className="text-rose-600">{(f1.negative_pct ?? 0).toFixed(0)}%-</span>
                                    <span>{f1.mention_count ?? 0} mentions</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40 text-xs">No data</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {f2 ? (
                                <div className="space-y-1">
                                  <SentimentBar
                                    positive={f2.positive_pct ?? 0}
                                    negative={f2.negative_pct ?? 0}
                                    neutral={f2.neutral_pct ?? 0}
                                  />
                                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                                    <span className="text-emerald-600">{(f2.positive_pct ?? 0).toFixed(0)}%+</span>
                                    <span className="text-rose-600">{(f2.negative_pct ?? 0).toFixed(0)}%-</span>
                                    <span>{f2.mention_count ?? 0} mentions</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40 text-xs">No data</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {f1 && f2 ? (
                                <DeltaBadge a={f1.negative_pct ?? 0} b={f2.negative_pct ?? 0} />
                              ) : (
                                <Minus className="w-3 h-3 text-muted-foreground/30" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language breakdown comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: p1Name, data: p1 },
              { name: p2Name, data: p2 },
            ].map(({ name, data }) => (
              <Card key={name}>
                <CardHeader>
                  <CardTitle className="text-base">{name} — Language Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {Object.entries(data.overview.language_breakdown || {})
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 6)
                      .map(([lang, count]) => {
                        const total = Object.values(data.overview.language_breakdown).reduce(
                          (s, v) => s + (v as number), 0
                        );
                        const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                        return (
                          <div key={lang} className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium uppercase">{lang}</span>
                              <span className="text-muted-foreground">{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Same product selected warning */}
      {product1Id && product2Id && product1Id === product2Id && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-sm text-amber-700">Please select two different datasets to compare.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
