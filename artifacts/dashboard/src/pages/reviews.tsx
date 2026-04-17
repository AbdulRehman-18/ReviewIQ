import { useProduct } from "@/contexts/ProductContext";
import { useIngest } from "@/contexts/IngestContext";
import { useGetProductReviews, getGetProductReviewsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLanguageLabel } from "@/lib/review-analysis";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type ReviewFilter = "all" | "positive" | "negative" | "neutral" | "sarcastic" | "ambiguous" | "bot" | "duplicates" | "multilingual";

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
  { value: "sarcastic", label: "Sarcastic" },
  { value: "ambiguous", label: "Ambiguous" },
  { value: "bot", label: "Bot/Spam" },
  { value: "duplicates", label: "Duplicates" },
  { value: "multilingual", label: "Multi-language" },
];

function getReviewLanguages(review: any) {
  if (Array.isArray(review.languages) && review.languages.length) {
    return review.languages;
  }
  if (typeof review.language === "string") {
    return review.language.split(/[,+/]/).map((item: string) => item.trim()).filter(Boolean);
  }
  return [];
}

function matchesFilter(review: any, filter: ReviewFilter) {
  const sentiment = review.overall_sentiment;

  switch (filter) {
    case "positive":
    case "negative":
    case "neutral":
      return sentiment === filter;
    case "sarcastic":
      return review.is_sarcastic || sentiment === "sarcastic" || sentiment === "sarcasm";
    case "ambiguous":
      return sentiment === "ambiguous";
    case "bot":
      return review.is_bot || review.is_spam;
    case "duplicates":
      return review.is_duplicate;
    case "multilingual":
      return getReviewLanguages(review).length > 1;
    default:
      return true;
  }
}

function getSentimentClass(sentiment: string) {
  if (sentiment === "positive") return "bg-emerald-500 hover:bg-emerald-600";
  if (sentiment === "negative") return "bg-rose-500 hover:bg-rose-600";
  if (sentiment === "sarcastic" || sentiment === "sarcasm") return "bg-amber-500 hover:bg-amber-600 text-white";
  if (sentiment === "ambiguous") return "bg-violet-500 hover:bg-violet-600 text-white";
  return "";
}

function getSentimentVariant(sentiment: string) {
  if (sentiment === "positive") return "default";
  if (sentiment === "negative") return "destructive";
  return "secondary";
}

export default function ReviewsPage() {
  const { selectedProductId } = useProduct();
  const { data: ingestData } = useIngest();
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const isMock = import.meta.env.VITE_USE_MOCK_API === "true" || !selectedProductId;

  const { data: apiData, isLoading } = useGetProductReviews(selectedProductId!, {}, { query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductReviewsQueryKey(selectedProductId!, {}) } });

  const baseData = apiData || ingestData?.reviews;
  const allItems = useMemo(() => baseData?.items || [], [baseData]);

  const filteredItems = useMemo(() => {
    let items = allItems.filter((review: any) => matchesFilter(review, filter));

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      items = items.filter((review: any) =>
        [
          review.text,
          review.overall_sentiment,
          getLanguageLabel(getReviewLanguages(review)),
          ...(review.features || []).map((feature: any) => feature.feature),
        ].join(" ").toLowerCase().includes(lowerQuery)
      );
    }

    return items;
  }, [allItems, filter, searchQuery]);

  const data = baseData ? {
    ...baseData,
    items: filteredItems,
    total: filteredItems.length
  } : undefined;

  const filterCounts = useMemo(() => {
    return FILTERS.reduce<Record<ReviewFilter, number>>((acc, item) => {
      acc[item.value] = allItems.filter((review: any) => matchesFilter(review, item.value)).length;
      return acc;
    }, {} as Record<ReviewFilter, number>);
  }, [allItems]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">Analyze and explore customer reviews in detail.</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as ReviewFilter)} className="w-full lg:w-auto">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            {FILTERS.map((item) => (
              <TabsTrigger 
                key={item.value} 
                value={item.value} 
                className="group gap-1 rounded-full border border-border/40 bg-background px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground data-[state=active]:border-primary/30 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                {item.label}
                <span className="ml-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-muted/60 px-1.5 text-[10px] font-medium text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                  {filterCounts[item.value] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full lg:w-72 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input placeholder="Search reviews..." className="pl-9 h-9 rounded-full bg-background border-border/40 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-primary/50 transition-all shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Lang</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Features</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading reviews...
                </TableCell>
              </TableRow>
            ) : data?.items && data.items.length > 0 ? data.items.map((review: any) => (
              <TableRow key={review.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {review.created_at ? new Date(review.created_at).toLocaleDateString() : "Unknown"}
                </TableCell>
                <TableCell className="min-w-[320px] max-w-xl">
                  <ScrollArea className="h-28 pr-4">
                    <p className="whitespace-pre-wrap break-words leading-6 text-sm">
                      {review.text}
                    </p>
                  </ScrollArea>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 min-w-28">
                    {getReviewLanguages(review).map((language: string) => (
                      <Badge key={language} variant="outline" className="text-[10px]" title={getLanguageLabel([language])}>
                        {language.toUpperCase()}
                      </Badge>
                    ))}
                    {getReviewLanguages(review).length === 0 && (
                      <span className="text-xs text-muted-foreground">Unknown</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getSentimentVariant(review.overall_sentiment) as any} className={getSentimentClass(review.overall_sentiment)}>
                    {review.overall_sentiment}
                  </Badge>
                  {(review.is_bot || review.is_spam) && (
                    <Badge variant="outline" className="ml-1 text-[10px]">bot</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {review.features && review.features.map((f: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {f.feature}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No reviews found. Ingest data to see reviews here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
