import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Upload, FileCheck, Loader2, CheckCircle2, AlertCircle, Trash2, Brain, Globe } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useIngest } from "@/contexts/IngestContext";
import { analyzeReviews, buildLanguageBreakdown, extractReviewTextItems } from "@/lib/review-analysis";
import { analyzeWithOpenRouter } from "@/lib/openrouter-analysis";
import { analyzeRegionalLanguages } from "@/lib/gemini-analysis";
import { useProduct } from "@/contexts/ProductContext";
import { parseCSV, extractProducts } from "@/lib/csv-parser";
import { processDataset, loadAllDatasets, type DatasetInfo } from "@/lib/dataset-loader";

const OR_KEY    = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
const OR_MODEL  = (import.meta.env.VITE_OPENROUTER_MODEL as string | undefined) ?? "openai/gpt-4o-mini";
const GEM_KEY   = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// ─── Analysis steps display ───────────────────────────────────────────────────

const STEPS = [
  { id: "parse",      label: "Parsing input data" },
  { id: "client",     label: "Running initial analysis" },
  { id: "openrouter", label: "Deep AI Sentiment + Feature analysis" },
  { id: "gemini",     label: "Advanced Regional language detection" },
  { id: "build",      label: "Building dashboard metrics" },
];

function StepList({ step, hasOR, hasGemini }: { step: string; hasOR: boolean; hasGemini: boolean }) {
  const visible = STEPS.filter((s) => {
    if (s.id === "openrouter" && !hasOR) return false;
    if (s.id === "gemini" && !hasGemini) return false;
    return true;
  });

  return (
    <div className="space-y-2 text-left w-full max-w-sm">
      {visible.map((s) => {
        const doneIdx   = visible.findIndex((v) => v.id === step);
        const currentIdx = visible.findIndex((v) => v.id === s.id);
        const done   = doneIdx > currentIdx;
        const active = s.id === step;
        return (
          <div
            key={s.id}
            className={`flex items-center gap-2.5 text-[12.5px] transition-colors ${
              active ? "text-foreground font-medium" :
              done   ? "text-muted-foreground/60 line-through" :
                       "text-muted-foreground/40"
            }`}
          >
            {done ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : active ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
            ) : (
              <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
            )}
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ProcessMode = "file" | "text" | "simulated";

export default function IngestPage() {
  const [, setLocation] = useLocation();
  const { setIngestedData, resetData, products } = useIngest();
  const { selectedProductId, setSelectedProductId } = useProduct();

  const [file, setFile]             = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [productName, setProductName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [currentStep, setCurrentStep] = useState("parse");
  const [result, setResult]         = useState<{ total: number; positive: number; negative: number; sarcasm: number } | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [availableDatasets, setAvailableDatasets] = useState<DatasetInfo[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

  const processLinesInternal = async (lines: string[], name: string) => {
    setIsProcessing(true);
    setProgress(5);
    setCurrentStep("parse");
    setResult(null);
    setError(null);

    try {
      // Step 1: Client-side base analysis
      setCurrentStep("client");
      setProgress(15);
      const baseAnalysis = analyzeReviews(lines);
      let analyzedReviews = baseAnalysis.reviews;
      setProgress(30);

      // Step 2: OpenRouter deep analysis
      if (OR_KEY) {
        setCurrentStep("openrouter");
        setProgress(35);
        const texts = lines.map((l) => l.trim()).filter(Boolean);
        const orResults = await analyzeWithOpenRouter(
          texts,
          OR_KEY,
          OR_MODEL,
          (pct) => setProgress(35 + Math.round(pct * 0.4))
        );

        analyzedReviews = analyzedReviews.map((review, i) => {
          const or = orResults[i];
          if (!or) return review;
          const hasExplicitFeatures = review.features.some(
            (f) => f.feature.toLowerCase() !== "general quality"
          );
          return {
            ...review,
            overall_sentiment: or.overall_sentiment,
            sentiment_score:   or.sentiment_score,
            is_spam:           or.is_spam,
            is_bot:            or.is_bot,
            is_sarcastic:      or.is_sarcastic,
            features:          hasExplicitFeatures
              ? review.features
              : (or.features.length > 0 ? or.features : review.features),
          };
        });
        setProgress(75);
      }

      // Step 3: Gemini language analysis
      let languageBreakdown = buildLanguageBreakdown(analyzedReviews);
      let languagesDetected = Object.keys(languageBreakdown);

      if (GEM_KEY) {
        setCurrentStep("gemini");
        setProgress(78);
        try {
          const geminiResult = await analyzeRegionalLanguages(lines, GEM_KEY);
          languageBreakdown = geminiResult.language_breakdown;
          languagesDetected = geminiResult.languages_detected;
        } catch (e) {
          console.warn("Gemini language analysis failed, using fallback:", e);
        }
        setProgress(88);
      }

      // Step 4: Build final metrics
      setCurrentStep("build");
      setProgress(92);

      const total = analyzedReviews.length || 1;
      const count = (pred: (r: typeof analyzedReviews[0]) => boolean) =>
        analyzedReviews.filter(pred).length;

      const posCount  = count((r) => r.overall_sentiment === "positive");
      const negCount  = count((r) => r.overall_sentiment === "negative");
      const sarcCount = count((r) => r.is_sarcastic || r.overall_sentiment === "sarcastic");
      const ambCount  = count((r) => r.overall_sentiment === "ambiguous");

      const posPercent  = Math.round((posCount / total) * 100);
      const negPercent  = Math.round((negCount / total) * 100);
      const sarcPercent = Math.round((sarcCount / total) * 100);
      const ambPercent  = Math.round((ambCount / total) * 100);
      const neutralPercent = Math.max(0, 100 - posPercent - negPercent - sarcPercent - ambPercent);

      const spamCount = count((r) => r.is_spam || r.is_bot);
      const dupeCount = count((r) => r.is_duplicate);

      // Aggregate features
      const featureMap = new Map<string, { pos: number; neg: number; neu: number; count: number }>();
      analyzedReviews.forEach((review) => {
        review.features.forEach((f) => {
          const existing = featureMap.get(f.feature) ?? { pos: 0, neg: 0, neu: 0, count: 0 };
          existing.count++;
          if (f.sentiment === "positive") existing.pos++;
          else if (f.sentiment === "negative") existing.neg++;
          else existing.neu++;
          featureMap.set(f.feature, existing);
        });
      });

      const syntheticFeatures = Array.from(featureMap.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([feature, v]) => ({
          feature,
          mention_count:  v.count,
          positive_pct:   Math.round((v.pos / v.count) * 100),
          neutral_pct:    Math.round((v.neu / v.count) * 100),
          negative_pct:   Math.round((v.neg / v.count) * 100),
          ambiguous_pct:  0,
        }));

      if (syntheticFeatures.length === 0) {
        syntheticFeatures.push({
          feature:       "General Quality",
          mention_count: total,
          positive_pct:  posPercent,
          neutral_pct:   neutralPercent,
          negative_pct:  negPercent,
          ambiguous_pct: ambPercent,
        });
      }

      const syntheticIssues = syntheticFeatures
        .filter((f) => f.negative_pct >= 30 && f.mention_count >= 2)
        .slice(0, 5)
        .map((f) => ({
          feature:     f.feature,
          description: `${f.negative_pct}% negative sentiment across ${f.mention_count} mentions`,
          severity:    f.negative_pct >= 60 ? "critical" : f.negative_pct >= 40 ? "high" : "medium",
          from_pct:    Math.max(0, f.negative_pct - 8),
          to_pct:      f.negative_pct,
        }));

      const syntheticTrends = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const v = (29 - i) * 0.5;
        return {
          index:         i + 1,
          date:          d.toISOString().split("T")[0],
          feature:       "General Quality",
          positive_pct:  Math.max(0, Math.min(100, Math.round(posPercent  + Math.sin(i) * 5 - v))),
          negative_pct:  Math.max(0, Math.min(100, Math.round(negPercent  + Math.cos(i) * 3 + v * 0.4))),
          sarcasm_pct:   Math.max(0, Math.min(100, Math.round(sarcPercent + Math.sin(i * 1.5) * 2))),
          bots_pct:      Math.max(0, Math.min(100, Math.round(4 + Math.cos(i * 2) * 1.5))),
          mention_count: total,
        };
      });

      setIngestedData(
        {
          overview: {
            total_reviews:          total,
            valid_reviews:          Math.max(0, total - spamCount - dupeCount),
            spam_count:             spamCount,
            duplicate_count:        dupeCount,
            sarcastic_count:        sarcCount,
            emerging_issues_count:  syntheticIssues.length,
            languages_detected:     languagesDetected,
            language_breakdown:     languageBreakdown,
            overall_sentiment: {
              positive:  posPercent,
              neutral:   neutralPercent,
              negative:  negPercent,
              ambiguous: ambPercent,
              sarcasm:   sarcPercent,
            },
          },
          features: syntheticFeatures,
          issues:   syntheticIssues,
          reviews: {
            items: analyzedReviews,
            total,
            page:  1,
            size:  total,
            pages: 1,
          },
          trends:        syntheticTrends,
          isDataIngested: true,
        },
        name
      );

      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setResult({ total, positive: posPercent, negative: negPercent, sarcasm: sarcPercent });
      }, 400);
    } catch (err: unknown) {
      setIsProcessing(false);
      setError(`Analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const processData = async (mode: ProcessMode = "simulated") => {
    if (mode === "file" && file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        let lines: string[] = [];
        
        // Check if it's a CSV file
        if (file.name.endsWith(".csv") || file.type === "text/csv") {
          try {
            const parsed = parseCSV(text);
            const productList = extractProducts(parsed);

            if (productList.length > 0 && productList[0] !== "All Products") {
              // Multi-product CSV: process ALL rows together via processDataset
              // so Total Reviews reflects the full dataset (e.g. 200, not 50).
              setIsProcessing(true);
              setCurrentStep("parse");
              setProgress(5);

              const dsName =
                productName.trim() ||
                file.name.replace(/\.csv$/i, "") ||
                `Dataset ${products.length + 1}`;

              const processed = await processDataset(text, dsName, {
                useOpenRouter: !!OR_KEY,
                openRouterKey: OR_KEY,
                openRouterModel: OR_MODEL,
                useGemini: !!GEM_KEY,
                geminiKey: GEM_KEY,
                onProgress: (p, s) => { setProgress(p); setCurrentStep(s); },
              });

              setIngestedData(
                {
                  overview: processed.overview,
                  features: processed.features,
                  issues: processed.issues,
                  reviews: {
                    items: processed.allReviews,
                    total: processed.allReviews.length,
                    page: 1,
                    size: processed.allReviews.length,
                    pages: 1,
                  },
                  trends: processed.trends,
                  isDataIngested: true,
                  productsList: processed.productsList,
                  productsData: processed.products,
                },
                dsName
              );

              setProgress(100);
              setTimeout(() => {
                setIsProcessing(false);
                setResult({
                  total: processed.overview.total_reviews,
                  positive: processed.overview.overall_sentiment.positive,
                  negative: processed.overview.overall_sentiment.negative,
                  sarcasm: processed.overview.overall_sentiment.sarcasm,
                });
              }, 400);
              return;
            }

            // Single-product or no product column — fall through to processLines
            lines = parsed.reviewTexts;
          } catch (err) {
            console.warn('CSV parsing failed, falling back to line-by-line:', err);
            lines = text.split("\n").filter((l) => l.trim());
          }
        } else if (file.name.endsWith(".json") || file.type === "application/json") {
          try { 
            lines = extractReviewTextItems(JSON.parse(text)); 
          } catch { 
            lines = text.split("\n").filter((l) => l.trim()); 
          }
        } else {
          const all = text.split("\n").filter((l) => l.trim());
          lines = all.length > 1 ? all.slice(1) : all;
        }
        
        const defaultName = productName.trim() || file.name.replace(/\.(csv|json)$/i, "");
        await processLines(lines, defaultName);
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsText(file);
    } else if (mode === "text" && pastedText.trim()) {
      await processLines(pastedText.split("\n").filter((l) => l.trim()));
    } else {
      await processLines([
        "Great battery life and fast delivery.",
        "Product acha hai but packaging kharab thi.",
        "वाह, two days me broken product bhejna great service.",
        "நல்ல sound quality, price worth it.",
        "బాగుంది but charger slow.",
        "Worst build quality, refund please.",
        "Same same same same same same same same same",
        "Zabardast value for money!",
        "খুব ভালো product but delivery late.",
        "https://spam.example buy now discount code",
        "Amazing display quality, very crisp and bright.",
        "Battery drains too fast, very disappointed.",
        "Yeah right, the battery lasts FOREVER... if forever means 2 hours.",
        "ਵਧੀਆ product hai, recommendation karuga.",
        "Build quality is premium, feels solid in hand.",
        "Customer service was terrible, no response for 3 days.",
        "Very fast shipping, received in 1 day!",
        "Camera quality is okay but not great for the price.",
        "Software keeps crashing on startup.",
        "Perfect gift, my friend loved it!",
      ]);
    }
  };
  
  const processLines = async (lines: string[], customName?: string) => {
    const name = customName || productName.trim() || `Dataset ${products.length + 1}`;
    await processLinesInternal(lines, name);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      const valid = ["text/csv", "application/json"].includes(f.type) || f.name.endsWith(".csv") || f.name.endsWith(".json");
      valid ? (setFile(f), setError(null)) : (setFile(null), setError("Invalid file format. Please upload CSV or JSON."));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      const valid = ["text/csv", "application/json"].includes(f.type) || f.name.endsWith(".csv") || f.name.endsWith(".json");
      valid ? (setFile(f), setError(null)) : (setFile(null), setError("Invalid file format. Please upload CSV or JSON."));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Ingestion</h1>
          <p className="text-muted-foreground">Upload or paste customer reviews for AI-powered analysis.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Active API indicators */}
          <div className="flex gap-2">
            {OR_KEY ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1">
                <Brain className="w-3 h-3" /> AI Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px]">Client-side only</Badge>
            )}
          </div>
          {products.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetData} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" /> Clear All
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingest Reviews</CardTitle>
          <CardDescription>Choose your data source and optionally name this dataset.</CardDescription>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <h3 className="font-semibold text-lg">Analyzing your data...</h3>
              </div>
              <div className="w-full max-w-md space-y-3">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">{Math.round(progress)}% complete</p>
              </div>
              <StepList step={currentStep} hasOR={!!OR_KEY} hasGemini={!!GEM_KEY} />
            </div>
          ) : result ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-2xl mb-2">Analysis Complete!</h3>
                <p className="text-muted-foreground">Successfully processed and analyzed your dataset.</p>
                {OR_KEY && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
                    <Brain className="w-3 h-3" /> Advanced AI Analysis Applied
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl py-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{result.total}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Reviews</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{result.positive}%</div>
                  <div className="text-xs text-emerald-700/80 uppercase tracking-wider mt-1">Positive</div>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-rose-600">{result.negative}%</div>
                  <div className="text-xs text-rose-700/80 uppercase tracking-wider mt-1">Negative</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{result.sarcasm}%</div>
                  <div className="text-xs text-amber-700/80 uppercase tracking-wider mt-1">Sarcasm</div>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap justify-center">
                <Button variant="outline" onClick={() => { setResult(null); setFile(null); setPastedText(""); setProductName(""); }}>
                  Ingest More Data
                </Button>
                <Button onClick={() => setLocation("/")}>View Dashboard</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Dataset / Product Name <span className="font-normal normal-case">(optional)</span>
                </label>
                <Input
                  placeholder={`e.g. "Wireless Earbuds v2" — leave blank for auto-naming`}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="max-w-md"
                />
              </div>

              <Tabs defaultValue="upload">
                <TabsList className="mb-4">
                  <TabsTrigger value="datasets">Load Datasets</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Reviews</TabsTrigger>
                  <TabsTrigger value="simulated">Simulated Feed</TabsTrigger>
                </TabsList>

                <TabsContent value="datasets">
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium mb-2">Load from Datasets Folder</p>
                      <p className="text-xs text-muted-foreground">
                        Select a dataset from your artifacts/Datasets folder. Each dataset contains categorized reviews with multiple products/features.
                      </p>
                    </div>
                    
                    <div className="grid gap-3">
                      <div
                        onClick={async () => {
                          try {
                            setIsProcessing(true);
                            setCurrentStep('parse');
                            setProgress(5);
                            
                            const response = await fetch('/artifacts/Datasets/Electronics.csv');
                            const content = await response.text();
                            
                            const processed = await processDataset(content, 'Electronics', {
                              useOpenRouter: !!OR_KEY,
                              openRouterKey: OR_KEY,
                              openRouterModel: OR_MODEL,
                              useGemini: !!GEM_KEY,
                              geminiKey: GEM_KEY,
                              onProgress: (progress, step) => {
                                setProgress(progress);
                                setCurrentStep(step);
                              },
                            });
                            
                            setIngestedData(
                              {
                                overview: processed.overview,
                                features: processed.features,
                                issues: processed.issues,
                                reviews: {
                                  items: processed.allReviews,
                                  total: processed.allReviews.length,
                                  page: 1,
                                  size: processed.allReviews.length,
                                  pages: 1,
                                },
                                trends: processed.trends,
                                isDataIngested: true,
                                productsList: processed.productsList,
                                productsData: processed.products,
                              },
                              'Electronics'
                            );
                            
                            const { positive, negative, sarcasm } = processed.overview.overall_sentiment;
                            setResult({ 
                              total: processed.overview.total_reviews, 
                              positive, 
                              negative, 
                              sarcasm 
                            });
                            setIsProcessing(false);
                          } catch (err) {
                            setError(`Failed to load Electronics dataset: ${err}`);
                            setIsProcessing(false);
                          }
                        }}
                        className="p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">Electronics</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              200 reviews · 4 products (Laptop, Smartphone, Earbuds, Speaker)
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">CSV</Badge>
                        </div>
                      </div>
                      
                      <div
                        onClick={async () => {
                          try {
                            setIsProcessing(true);
                            setCurrentStep('parse');
                            setProgress(5);
                            
                            const response = await fetch('/artifacts/Datasets/vehicle.csv');
                            const content = await response.text();
                            
                            const processed = await processDataset(content, 'Vehicle', {
                              useOpenRouter: !!OR_KEY,
                              openRouterKey: OR_KEY,
                              openRouterModel: OR_MODEL,
                              useGemini: !!GEM_KEY,
                              geminiKey: GEM_KEY,
                              onProgress: (progress, step) => {
                                setProgress(progress);
                                setCurrentStep(step);
                              },
                            });
                            
                            setIngestedData(
                              {
                                overview: processed.overview,
                                features: processed.features,
                                issues: processed.issues,
                                reviews: {
                                  items: processed.allReviews,
                                  total: processed.allReviews.length,
                                  page: 1,
                                  size: processed.allReviews.length,
                                  pages: 1,
                                },
                                trends: processed.trends,
                                isDataIngested: true,
                                productsList: processed.productsList,
                                productsData: processed.products,
                              },
                              'Vehicle'
                            );
                            
                            const { positive, negative, sarcasm } = processed.overview.overall_sentiment;
                            setResult({ 
                              total: processed.overview.total_reviews, 
                              positive, 
                              negative, 
                              sarcasm 
                            });
                            setIsProcessing(false);
                          } catch (err) {
                            setError(`Failed to load Vehicle dataset: ${err}`);
                            setIsProcessing(false);
                          }
                        }}
                        className="p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">Vehicle</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              49 reviews · 3 categories (Car, Bike, Bus)
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">CSV</Badge>
                        </div>
                      </div>
                      
                      <div
                        onClick={async () => {
                          try {
                            setIsProcessing(true);
                            setCurrentStep('parse');
                            setProgress(5);
                            
                            const response = await fetch('/artifacts/Datasets/health care.csv');
                            const content = await response.text();
                            
                            const processed = await processDataset(content, 'Health Care', {
                              useOpenRouter: !!OR_KEY,
                              openRouterKey: OR_KEY,
                              openRouterModel: OR_MODEL,
                              useGemini: !!GEM_KEY,
                              geminiKey: GEM_KEY,
                              onProgress: (progress, step) => {
                                setProgress(progress);
                                setCurrentStep(step);
                              },
                            });
                            
                            setIngestedData(
                              {
                                overview: processed.overview,
                                features: processed.features,
                                issues: processed.issues,
                                reviews: {
                                  items: processed.allReviews,
                                  total: processed.allReviews.length,
                                  page: 1,
                                  size: processed.allReviews.length,
                                  pages: 1,
                                },
                                trends: processed.trends,
                                isDataIngested: true,
                              },
                              'Health Care'
                            );
                            
                            const { positive, negative, sarcasm } = processed.overview.overall_sentiment;
                            setResult({ 
                              total: processed.overview.total_reviews, 
                              positive, 
                              negative, 
                              sarcasm 
                            });
                            setIsProcessing(false);
                          } catch (err) {
                            setError(`Failed to load Health Care dataset: ${err}`);
                            setIsProcessing(false);
                          }
                        }}
                        className="p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">Health Care</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              49 reviews · 3 products (Toothpaste, Handwash, Ashwagandha)
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">CSV</Badge>
                        </div>
                      </div>
                    </div>
                    
                    {error && (
                      <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="upload">
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors ${file ? "border-primary bg-primary/5" : "border-border"}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    {file ? (
                      <>
                        <FileCheck className="w-12 h-12 text-primary mb-4" />
                        <h3 className="font-semibold text-lg mb-1">{file.name}</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          {(file.size / 1024 / 1024).toFixed(2)} MB · Ready for analysis
                        </p>
                        <div className="flex gap-3">
                          <Button variant="outline" size="sm" onClick={() => setFile(null)}>Remove</Button>
                          <Button size="sm" onClick={() => processData("file")}>
                            {OR_KEY ? "Analyze with AI" : "Analyze File"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-lg mb-1">Click to upload or drag and drop</h3>
                        <p className="text-sm text-muted-foreground mb-4">CSV or JSON format (max 50 MB)</p>
                        <label>
                          <Button asChild><span>Select File</span></Button>
                          <input type="file" accept=".csv,.json,application/json,text/csv" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </>
                    )}
                  </div>
                  {error && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="paste">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste your reviews here (one per line)..."
                      className="min-h-[200px]"
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs text-muted-foreground">
                        {pastedText.split("\n").filter((l) => l.trim()).length} lines detected
                      </p>
                      <Button onClick={() => processData("text")} disabled={!pastedText.trim()}>
                        {OR_KEY ? "Analyze with AI" : "Analyze Reviews"}
                      </Button>
                    </div>
                    {error && (
                      <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="simulated">
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium mb-2">Multilingual Sample Dataset (20 reviews)</p>
                      <p className="text-xs text-muted-foreground">
                        Covers English, Hindi, Tamil, Telugu, Bengali, Punjabi — includes sarcasm, spam, and code-mixed reviews.
                        {OR_KEY && <span className="text-emerald-600"> Deep AI will provide advanced sentiment + feature analysis.</span>}
                        {GEM_KEY && <span className="text-blue-600"> AI will detect regional languages.</span>}
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => processData("simulated")}>
                      Start Simulated Feed
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingested datasets list */}
      {products.length > 0 && !isProcessing && !result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Ingested Datasets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {products.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedProductId === p.id ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/30"
                  }`}
                  onClick={() => setSelectedProductId(p.id)}
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  {selectedProductId === p.id && (
                    <Badge variant="secondary" className="text-[10px]">Active</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
