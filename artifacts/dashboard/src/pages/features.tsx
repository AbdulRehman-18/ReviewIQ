import { useState, useMemo, useEffect } from "react";
import { useProduct } from "@/contexts/ProductContext";
import { useIngest } from "@/contexts/IngestContext";
import {
  useGetProductFeatures,
  useGetProductReviews,
  getGetProductFeaturesQueryKey,
  getGetProductReviewsQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function FeaturesPage() {
  const { selectedProductId } = useProduct();
  const { data: ingestData } = useIngest();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isMock = import.meta.env.VITE_USE_MOCK_API === "true" || !selectedProductId;

  const { data: apiFeatures, isLoading: isLoadingFeatures } = useGetProductFeatures(selectedProductId!, {
    query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductFeaturesQueryKey(selectedProductId!) },
  });

  const { data: apiReviews, isLoading: isLoadingReviews } = useGetProductReviews(selectedProductId!, {}, {
    query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductReviewsQueryKey(selectedProductId!, {}) },
  });

  const featuresData = apiFeatures || ingestData?.features || [];
  const reviewsData = apiReviews || ingestData?.reviews;
  
  // Set default selected feature once data loads
  useEffect(() => {
    if (featuresData.length > 0 && !selectedFeature) {
      setSelectedFeature(featuresData[0].feature);
    }
  }, [featuresData, selectedFeature]);

  // Filter features based on search
  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return featuresData;
    const lowerQ = searchQuery.toLowerCase();
    return featuresData.filter((f: any) => f.feature.toLowerCase().includes(lowerQ));
  }, [featuresData, searchQuery]);

  // Filter reviews matching the selected feature
  const filteredReviews = useMemo(() => {
    if (!selectedFeature || !reviewsData?.items) return [];
    return reviewsData.items.filter((review: any) => 
      review.features && review.features.some((f: any) => f.feature === selectedFeature)
    );
  }, [reviewsData, selectedFeature]);

  function getSentimentColor(sentiment: string) {
    if (sentiment === "positive") return "bg-emerald-500 text-white";
    if (sentiment === "negative") return "bg-rose-500 text-white";
    return "bg-secondary text-secondary-foreground";
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Analysis</h1>
        <p className="text-muted-foreground">Deep dive into customer sentiment for specific product features.</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Pane - Features Master List */}
        <Card className="w-1/3 flex flex-col min-h-0 shadow-sm border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Features</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search features..." 
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {isLoadingFeatures ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading features...</div>
              ) : filteredFeatures.length > 0 ? (
                <div className="flex flex-col">
                  {filteredFeatures.map((f: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFeature(f.feature)}
                      className={`flex flex-col items-start w-full p-4 border-b transition-colors hover:bg-muted/50 text-left ${
                        selectedFeature === f.feature ? "bg-muted border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full mb-2">
                        <span className="font-semibold text-sm">{f.feature}</span>
                        <ChevronRight className={`h-4 w-4 ${selectedFeature === f.feature ? "text-primary" : "text-muted-foreground opacity-50"}`} />
                      </div>
                      
                      <div className="w-full space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-medium">
                          <span>Pos: {f.positive_pct.toFixed(0)}%</span>
                          <span>Neu: {f.neutral_pct.toFixed(0)}%</span>
                          <span>Neg: {f.negative_pct.toFixed(0)}%</span>
                        </div>
                        <div className="flex h-1.5 w-full rounded-full overflow-hidden">
                          <div style={{ width: `${f.positive_pct}%` }} className="bg-emerald-500" />
                          <div style={{ width: `${f.neutral_pct}%` }} className="bg-slate-300 dark:bg-slate-700" />
                          <div style={{ width: `${f.negative_pct}%` }} className="bg-rose-500" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">No features found.</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Pane - Feature Details & Reviews List */}
        <Card className="w-2/3 flex flex-col min-h-0 shadow-sm border-border">
          {selectedFeature ? (
            <>
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {selectedFeature}
                      <Badge variant="secondary" className="font-normal">{filteredReviews.length} Reviews</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Customer feedback mentioning this specific feature.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden bg-muted/10">
                <ScrollArea className="h-full p-4">
                  {isLoadingReviews ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">Loading reviews...</div>
                  ) : filteredReviews.length > 0 ? (
                    <div className="space-y-4">
                      {filteredReviews.map((review: any) => {
                        // Find the feature sentiment specifically for this feature in this review
                        const featureSentimentInfo = review.features?.find((f: any) => f.feature === selectedFeature);
                        
                        return (
                          <div key={review.id} className="bg-background border rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex gap-2">
                                {featureSentimentInfo && (
                                  <Badge className={getSentimentColor(featureSentimentInfo.sentiment)}>
                                    Feature Sentiment: {featureSentimentInfo.sentiment}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-muted-foreground">
                                  Overall: {review.overall_sentiment}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString() : "Unknown date"}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {review.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No reviews found mentioning <strong>{selectedFeature}</strong>.</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <Search className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-lg font-medium">No Feature Selected</p>
              <p className="text-sm">Select a feature from the left pane to view related reviews.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
