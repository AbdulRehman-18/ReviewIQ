import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { parseCSV, groupByProduct, extractProducts } from "@/lib/csv-parser";
import { analyzeReviewText } from "@/lib/review-analysis";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, BarChart2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Feature keyword extraction ──────────────────────────────────────────────

const FEATURE_KEYWORDS: Record<string, string[]> = {
  "Battery Life":       ["battery", "charge", "charging", "power", "backup", "mah", "drain"],
  "Performance":        ["performance", "speed", "fast", "slow", "lag", "smooth", "processor", "cpu", "ram", "hang"],
  "Display / Screen":   ["screen", "display", "resolution", "brightness", "oled", "amoled", "retina", "refresh"],
  "Camera":             ["camera", "photo", "picture", "image", "selfie", "megapixel", "lens", "video"],
  "Build Quality":      ["build", "quality", "material", "durability", "sturdy", "solid", "plastic", "metal"],
  "Price / Value":      ["price", "cost", "expensive", "cheap", "value", "worth", "paisa", "vasool", "money"],
  "Sound / Audio":      ["sound", "audio", "speaker", "bass", "volume", "music", "noise", "earphone", "headphone"],
  "Comfort / Fit":      ["comfort", "ergonomic", "fit", "comfortable", "wear", "grip", "feel"],
  "Mileage / Fuel":     ["mileage", "fuel", "efficiency", "kmpl", "petrol", "diesel", "tank"],
  "Reliability":        ["reliable", "dependable", "trust", "long lasting", "durable", "consistent"],
  "Effectiveness":      ["effective", "works", "result", "benefit", "improved", "helps", "relief", "cure"],
  "Taste / Flavour":    ["taste", "flavor", "flavour", "smell", "scent", "fragrance"],
  "Packaging":          ["packaging", "delivery", "packed", "box", "shipping", "unbox"],
  "Customer Service":   ["service", "support", "customer", "help", "response", "warranty", "return"],
  "Design / Look":      ["design", "look", "style", "color", "colour", "appearance", "sleek", "slim"],
  "Connectivity":       ["wifi", "bluetooth", "network", "signal", "connectivity", "hotspot", "5g", "4g"],
};

type Sentiment = "positive" | "negative" | "neutral" | "sarcastic" | "ambiguous";

interface FeatureSentiment {
  feature: string;
  positive: number;
  neutral: number;
  negative: number;
  mention_count: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

interface ProductData {
  reviewCount: number;
  features: FeatureSentiment[];
  overallSentiment: { positive: number; neutral: number; negative: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractFeatures(reviews: string[]): FeatureSentiment[] {
  const featureMap = new Map<
    string,
    { pos: number; neg: number; neu: number; count: number }
  >();

  reviews.forEach((reviewText) => {
    const lower = reviewText.toLowerCase();
    const analysis = analyzeReviewText(reviewText);
    const sentiment: Sentiment = analysis.overall_sentiment;

    Object.entries(FEATURE_KEYWORDS).forEach(([featureName, keywords]) => {
      const mentioned = keywords.some((kw) => lower.includes(kw));
      if (!mentioned) return;

      const existing = featureMap.get(featureName) ?? { pos: 0, neg: 0, neu: 0, count: 0 };
      existing.count++;
      if (sentiment === "positive") existing.pos++;
      else if (sentiment === "negative") existing.neg++;
      else existing.neu++;
      featureMap.set(featureName, existing);
    });
  });

  return Array.from(featureMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([feature, v]) => ({
      feature,
      positive: v.pos,
      neutral: v.neu,
      negative: v.neg,
      mention_count: v.count,
      positive_pct: Math.round((v.pos / v.count) * 100),
      neutral_pct: Math.round((v.neu / v.count) * 100),
      negative_pct: Math.round((v.neg / v.count) * 100),
    }));
}

function buildProductData(reviews: string[]): ProductData {
  const features = extractFeatures(reviews);
  const total = reviews.length || 1;
  let pos = 0, neg = 0, neu = 0;
  reviews.forEach((r) => {
    const s = analyzeReviewText(r).overall_sentiment;
    if (s === "positive") pos++;
    else if (s === "negative") neg++;
    else neu++;
  });
  return {
    reviewCount: reviews.length,
    features,
    overallSentiment: {
      positive: Math.round((pos / total) * 100),
      neutral: Math.round((neu / total) * 100),
      negative: Math.round((neg / total) * 100),
    },
  };
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VisualizePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [products, setProducts] = useState<string[]>([]);
  const [productDataMap, setProductDataMap] = useState<Record<string, ProductData>>({});

  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedFeature, setSelectedFeature] = useState<string>("");

  // Restore from sessionStorage on mount so dropdowns survive navigation
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("viz_data");
      if (cached) {
        const { products: p, productDataMap: dm, fileName: fn, selectedProduct: sp } = JSON.parse(cached);
        setProducts(p ?? []);
        setProductDataMap(dm ?? {});
        setFileName(fn ?? null);
        setSelectedProduct(sp ?? p?.[0] ?? "");
      }
    } catch { /* ignore */ }
  }, []);

  // Persist to sessionStorage whenever data changes
  useEffect(() => {
    if (products.length === 0) return;
    try {
      sessionStorage.setItem("viz_data", JSON.stringify({ products, productDataMap, fileName, selectedProduct }));
    } catch { /* ignore */ }
  }, [products, productDataMap, fileName, selectedProduct]);

  // ── CSV processing ────────────────────────────────────────────────────────

  const processCSV = useCallback((content: string, name: string) => {
    setIsProcessing(true);
    // Defer to avoid blocking paint
    setTimeout(() => {
      try {
        const parsed = parseCSV(content);
        const productGroups = groupByProduct(parsed);
        const productList = extractProducts(parsed);

        const dataMap: Record<string, ProductData> = {};
        for (const [pName, reviews] of productGroups.entries()) {
          dataMap[pName] = buildProductData(reviews);
        }

        setProducts(productList);
        setProductDataMap(dataMap);
        setFileName(name);
        setSelectedProduct(productList[0] ?? "");
        setSelectedFeature("");
      } finally {
        setIsProcessing(false);
      }
    }, 0);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) processCSV(content, file.name);
      };
      reader.readAsText(file);
    },
    [processCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const currentProductData = useMemo(
    () => (selectedProduct ? productDataMap[selectedProduct] : null),
    [productDataMap, selectedProduct]
  );

  const availableFeatures = useMemo(
    () => currentProductData?.features ?? [],
    [currentProductData]
  );

  // When product changes, reset feature and auto-select first
  const handleProductChange = useCallback(
    (value: string) => {
      setSelectedProduct(value);
      setSelectedFeature("");
    },
    []
  );

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (!currentProductData) return [];

    if (selectedFeature) {
      const feat = currentProductData.features.find((f) => f.feature === selectedFeature);
      if (!feat) return [];
      return [
        { name: "Positive", value: feat.positive_pct, fill: "#10b981" },
        { name: "Neutral", value: feat.neutral_pct, fill: "#94a3b8" },
        { name: "Negative", value: feat.negative_pct, fill: "#f43f5e" },
      ];
    }

    // No feature selected → show overall product sentiment
    const { overallSentiment } = currentProductData;
    return [
      { name: "Positive", value: overallSentiment.positive, fill: "#10b981" },
      { name: "Neutral", value: overallSentiment.neutral, fill: "#94a3b8" },
      { name: "Negative", value: overallSentiment.negative, fill: "#f43f5e" },
    ];
  }, [currentProductData, selectedFeature]);

  const featureOverviewData = useMemo(() => {
    if (!currentProductData || selectedFeature) return [];
    return currentProductData.features.slice(0, 8).map((f) => ({
      name: f.feature.replace(" / ", "/"),
      Positive: f.positive_pct,
      Neutral: f.neutral_pct,
      Negative: f.negative_pct,
    }));
  }, [currentProductData, selectedFeature]);

  const selectedFeatureData = useMemo(() => {
    if (!selectedFeature || !currentProductData) return null;
    return currentProductData.features.find((f) => f.feature === selectedFeature) ?? null;
  }, [selectedFeature, currentProductData]);

  const hasData = products.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Visualization</h1>
          <p className="text-muted-foreground">
            Upload a CSV to explore product &amp; feature sentiment interactively.
          </p>
        </div>
        {hasData && (
          <button
            onClick={() => {
              sessionStorage.removeItem("viz_data");
              setProducts([]);
              setProductDataMap({});
              setFileName(null);
              setSelectedProduct("");
              setSelectedFeature("");
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Upload zone */}
      {!hasData && (
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3 select-none">
            <UploadCloud
              className={`w-12 h-12 transition-colors ${
                isDragging ? "text-primary" : "text-muted-foreground/30"
              }`}
            />
            {isProcessing ? (
              <p className="text-sm text-muted-foreground animate-pulse">Processing CSV…</p>
            ) : (
              <>
                <p className="text-base font-medium text-muted-foreground">
                  Drop a CSV file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Must contain a product column and a review/text column
                </p>
              </>
            )}
          </CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </Card>
      )}

      {/* Dashboard */}
      {hasData && (
        <AnimatePresence mode="wait">
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* File badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs gap-1.5">
                <BarChart2 className="w-3 h-3" />
                {fileName}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {products.length} product{products.length !== 1 ? "s" : ""} detected
              </span>
            </div>

            {/* ── Cascading Dropdowns ── */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filters</CardTitle>
                <CardDescription>Select a product, then narrow down by feature.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Dropdown A — Product */}
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product
                    </label>
                    <Select value={selectedProduct} onValueChange={handleProductChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a product…" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentProductData && (
                      <p className="text-[11px] text-muted-foreground">
                        {currentProductData.reviewCount} review
                        {currentProductData.reviewCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Dropdown B — Feature */}
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Feature
                    </label>
                    <Select
                      value={selectedFeature}
                      onValueChange={setSelectedFeature}
                      disabled={availableFeatures.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            availableFeatures.length === 0
                              ? "No features found"
                              : "All features (overview)"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFeatures.map((f) => (
                          <SelectItem key={f.feature} value={f.feature}>
                            <span className="flex items-center gap-2">
                              {f.feature}
                              <span className="text-[10px] text-muted-foreground">
                                ({f.mention_count} mention{f.mention_count !== 1 ? "s" : ""})
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedFeature && selectedFeatureData && (
                      <p className="text-[11px] text-muted-foreground">
                        {selectedFeatureData.mention_count} mention
                        {selectedFeatureData.mention_count !== 1 ? "s" : ""} for this feature
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Visualization ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedProduct}__${selectedFeature}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {selectedFeature ? (
                  /* Single-feature breakdown */
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">
                            {selectedFeature}
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              in {selectedProduct}
                            </span>
                          </CardTitle>
                          <CardDescription>
                            Sentiment breakdown across{" "}
                            {selectedFeatureData?.mention_count ?? 0} mentions
                          </CardDescription>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {selectedFeatureData && (
                            <>
                              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                                {selectedFeatureData.positive_pct}% positive
                              </Badge>
                              <Badge className="bg-rose-100 text-rose-700 border-0">
                                {selectedFeatureData.negative_pct}% negative
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={chartData}
                          margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
                          barSize={64}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                          />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Sentiment summary bar */}
                      {selectedFeatureData && (
                        <div className="mt-4 space-y-1">
                          <div className="flex h-2 w-full rounded-full overflow-hidden">
                            <div
                              style={{ width: `${selectedFeatureData.positive_pct}%` }}
                              className="bg-emerald-500"
                            />
                            <div
                              style={{ width: `${selectedFeatureData.neutral_pct}%` }}
                              className="bg-slate-300 dark:bg-slate-600"
                            />
                            <div
                              style={{ width: `${selectedFeatureData.negative_pct}%` }}
                              className="bg-rose-500"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Positive {selectedFeatureData.positive_pct}%</span>
                            <span>Neutral {selectedFeatureData.neutral_pct}%</span>
                            <span>Negative {selectedFeatureData.negative_pct}%</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  /* Feature overview — grouped bar chart */
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Feature Overview
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          — {selectedProduct}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {availableFeatures.length > 0
                          ? `Sentiment breakdown across top ${Math.min(8, availableFeatures.length)} features. Select a feature above for details.`
                          : "No features detected in the reviews for this product."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {featureOverviewData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={340}>
                          <BarChart
                            data={featureOverviewData}
                            layout="vertical"
                            margin={{ top: 8, right: 32, left: 8, bottom: 8 }}
                            barSize={10}
                            barGap={2}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              tickFormatter={(v) => `${v}%`}
                              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={110}
                              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              content={<CustomTooltip />}
                              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                            />
                            <Legend
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: 12 }}
                            />
                            <Bar dataKey="Positive" fill="#10b981" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="Neutral" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="Negative" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        /* Fallback: overall product sentiment */
                        currentProductData && (
                          <>
                            <p className="text-xs text-muted-foreground mb-4">
                              No feature keywords detected. Showing overall product sentiment.
                            </p>
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart
                                data={chartData}
                                margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
                                barSize={56}
                              >
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))" }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  domain={[0, 100]}
                                  tickFormatter={(v) => `${v}%`}
                                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                  axisLine={false}
                                  tickLine={false}
                                  width={40}
                                />
                                <Tooltip
                                  content={<CustomTooltip />}
                                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                  {chartData.map((entry, idx) => (
                                    <Cell key={idx} fill={entry.fill} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </>
                        )
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Feature stat cards (when product selected, no feature) ── */}
            {!selectedFeature && availableFeatures.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableFeatures.slice(0, 8).map((f) => (
                  <button
                    key={f.feature}
                    onClick={() => setSelectedFeature(f.feature)}
                    className="text-left rounded-lg border bg-card p-3.5 hover:border-primary/50 hover:bg-muted/40 transition-colors shadow-sm"
                  >
                    <p className="text-xs font-semibold truncate mb-2">{f.feature}</p>
                    <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-1.5">
                      <div style={{ width: `${f.positive_pct}%` }} className="bg-emerald-500" />
                      <div style={{ width: `${f.neutral_pct}%` }} className="bg-slate-300 dark:bg-slate-600" />
                      <div style={{ width: `${f.negative_pct}%` }} className="bg-rose-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{f.mention_count} mentions</p>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
