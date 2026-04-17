import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useIngest } from "@/contexts/IngestContext";

export default function IngestPage() {
  const [, setLocation] = useLocation();
  const { setIngestedData } = useIngest();
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ total: number, positive: number, negative: number, sarcasm: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processData = (mode: 'file' | 'text' | 'simulated' = 'simulated') => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    const finishProcessing = (totalItems: number, posPercent: number = 65, negPercent: number = 15, sarcPercent: number = 5, analyzedReviews: any[] = []) => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            setResult({
              total: totalItems,
              positive: posPercent,
              negative: negPercent,
              sarcasm: sarcPercent
            });
            
            const syntheticOverview = {
              total_reviews: totalItems,
              valid_reviews: Math.floor(totalItems * 0.95),
              spam_count: Math.floor(totalItems * 0.02),
              duplicate_count: Math.floor(totalItems * 0.03),
              sarcastic_count: Math.floor((sarcPercent / 100) * totalItems),
              emerging_issues_count: 2,
              languages_detected: ["en"],
              language_breakdown: { en: totalItems },
              overall_sentiment: { positive: posPercent, neutral: 100 - posPercent - negPercent - sarcPercent, negative: negPercent, ambiguous: 0, sarcasm: sarcPercent }
            };
            
            const syntheticFeatures = [
               { feature: "General Quality", mention_count: Math.floor(totalItems * 0.8), positive_pct: posPercent, neutral_pct: 100-posPercent-negPercent-sarcPercent, negative_pct: negPercent, ambiguous_pct: sarcPercent }
            ];

            const syntheticTrends = Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const variance = (13 - i) * 0.8;
              return {
                index: i + 1, 
                date: d.toISOString().split('T')[0], 
                feature: "General Quality",
                positive_pct: Math.max(0, Math.min(100, Math.round(posPercent + Math.sin(i) * 5 - variance))),
                negative_pct: Math.max(0, Math.min(100, Math.round(negPercent + Math.cos(i) * 3 + variance))),
                sarcasm_pct: Math.max(0, Math.min(100, Math.round(sarcPercent + Math.sin(i * 1.5) * 2))),
                bots_pct: Math.max(0, Math.min(100, Math.round(4 + Math.cos(i * 2) * 1.5))),
                mention_count: totalItems 
              };
            });

            const syntheticReviews = {
              items: analyzedReviews,
              total: totalItems,
              page: 1,
              size: 10,
              pages: Math.ceil(totalItems / 10)
            };
            
            setIngestedData({
              overview: syntheticOverview,
              features: syntheticFeatures,
              trends: syntheticTrends,
              reviews: syntheticReviews,
              isDataIngested: true
            });
            
          }, 500);
        }
        setProgress(Math.min(currentProgress, 100));
      }, 400);
    };

    const getSentiment = (lines: string[]) => {
      const positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'perfect', 'love', 'best', 'fantastic', 'helpful', 'positive', 'recommend'];
      const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'worst', 'hate', 'disappointed', 'useless', 'wrong', 'negative', 'frustrating'];
      const sarcasmWords = ['sarcastic', 'yeah right', 'sure', 'as if', 'joke', 'kidding', 'whatever'];
      
      let pos = 0;
      let neg = 0;
      let sarc = 0;
      
      const analyzedReviews = lines.map((line, index) => {
        const lower = line.toLowerCase();
        const isPos = positiveWords.some(w => lower.includes(w));
        const isNeg = negativeWords.some(w => lower.includes(w));
        const isSarc = sarcasmWords.some(w => lower.includes(w));
        
        let sentiment = 'neutral';
        if (isSarc) { sarc++; sentiment = 'sarcastic'; }
        else if (isPos && !isNeg) { pos++; sentiment = 'positive'; }
        else if (isNeg && !isPos) { neg++; sentiment = 'negative'; }

        return {
          id: index + 1,
          product_id: 1,
          text: line,
          language: "en",
          overall_sentiment: sentiment,
          is_spam: false,
          is_duplicate: false,
          is_sarcastic: isSarc,
          features: [{ feature: "General Quality", sentiment: sentiment, confidence: 0.9 }],
          created_at: new Date().toISOString(),
          review_date: new Date().toISOString()
        };
      });
      
      const total = lines.length;
      if (total === 0) return { p: 0, n: 0, s: 0, reviews: [] };
      
      return {
        p: Math.round((pos / total) * 100) || 0,
        n: Math.round((neg / total) * 100) || 0,
        s: Math.round((sarc / total) * 100) || 0,
        reviews: analyzedReviews
      };
    };

    if (mode === 'file' && file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        let totalCount = 0;
        let linesToAnalyze: string[] = [];
        
        if (file.name.endsWith('.json') || file.type === 'application/json') {
          try {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
              totalCount = data.length;
              linesToAnalyze = data.map(d => JSON.stringify(d));
            } else {
              totalCount = 1;
              linesToAnalyze = [JSON.stringify(data)];
            }
          } catch (err) {
            linesToAnalyze = text.split('\n').filter(line => line.trim().length > 0);
            totalCount = linesToAnalyze.length;
          }
        } else {
          const allLines = text.split('\n').filter(line => line.trim().length > 0);
          linesToAnalyze = allLines.length > 1 ? allLines.slice(1) : allLines;
          totalCount = linesToAnalyze.length;
        }
        const sentiment = getSentiment(linesToAnalyze);
        finishProcessing(totalCount, sentiment.p, sentiment.n, sentiment.s, sentiment.reviews);
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setIsProcessing(false);
      };
      reader.readAsText(file);
    } else if (mode === 'text' && pastedText.trim()) {
      const linesToAnalyze = pastedText.split('\n').filter(line => line.trim().length > 0);
      const sentiment = getSentiment(linesToAnalyze);
      finishProcessing(linesToAnalyze.length, sentiment.p, sentiment.n, sentiment.s, sentiment.reviews);
    } else {
      const total = Math.floor(Math.random() * 500) + 100;
      const mockReviews = Array.from({length: 10}).map((_, i) => ({
          id: i + 1,
          product_id: 1,
          text: `Sample simulated review #${i + 1}`,
          language: "en",
          overall_sentiment: "neutral",
          is_spam: false,
          is_duplicate: false,
          is_sarcastic: false,
          features: [{ feature: "General Quality", sentiment: "neutral", confidence: 0.9 }],
          created_at: new Date().toISOString(),
          review_date: new Date().toISOString()
      }));
      finishProcessing(total, Math.floor(Math.random() * 40) + 40, Math.floor(Math.random() * 20) + 5, Math.floor(Math.random() * 10) + 1, mockReviews);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "text/csv" || selectedFile.type === "application/json" || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.json')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setFile(null);
        setError("Invalid file format. Please upload CSV or JSON.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type === "text/csv" || selectedFile.type === "application/json" || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.json')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setFile(null);
        setError("Invalid file format. Please upload CSV or JSON.");
      }
    }
  };

  const handleProcessFile = () => {
    if (!file) return;
    processData('file');
  };

  const handleProcessText = () => {
    if (!pastedText.trim()) return;
    processData('text');
  };

  const handleViewDashboard = () => {
    setLocation("/");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Ingestion</h1>
        <p className="text-muted-foreground">Upload or paste customer reviews for analysis.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingest Reviews</CardTitle>
          <CardDescription>Choose how you want to provide review data.</CardDescription>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <h3 className="font-semibold text-lg">Analyzing your data...</h3>
              </div>
              <div className="w-full max-w-md space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Extracting sentiment and feature mentions ({Math.round(progress)}%)
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-2xl mb-2">Analysis Complete!</h3>
                <p className="text-muted-foreground">Successfully processed and analyzed the dataset.</p>
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

              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => { setResult(null); setFile(null); setPastedText(""); }}>
                  Ingest More Data
                </Button>
                <Button onClick={handleViewDashboard}>View Dashboard</Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="upload">
              <TabsList className="mb-4">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="paste">Paste Reviews</TabsTrigger>
                <TabsTrigger value="simulated">Simulated Feed</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload">
                <div 
                  className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border'}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <>
                      <FileCheck className="w-12 h-12 text-primary mb-4" />
                      <h3 className="font-semibold text-lg mb-1">{file.name}</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for analysis
                      </p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setFile(null)} size="sm">Remove</Button>
                        <Button onClick={handleProcessFile} size="sm">Analyze File</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-lg mb-1">Click to upload or drag and drop</h3>
                      <p className="text-sm text-muted-foreground mb-4">CSV or JSON format (max 50MB)</p>
                      <label>
                        <Button asChild>
                          <span>Select File</span>
                        </Button>
                        <input type="file" accept=".csv,.json,application/json,text/csv" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </>
                  )}
                </div>
                {error && (
                  <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
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
                  <div className="flex justify-end">
                    <Button onClick={handleProcessText} disabled={!pastedText.trim()}>Analyze Reviews</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="simulated">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Start a simulated feed to see real-time analysis updates.</p>
                  <Button variant="secondary" onClick={() => processData('simulated')}>Start Simulated Feed</Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
