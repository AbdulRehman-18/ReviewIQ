import { useProduct } from "@/contexts/ProductContext";
import { useIngest } from "@/contexts/IngestContext";
import { useGetProductReviews, getGetProductReviewsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useState } from "react";

export default function ReviewsPage() {
  const { selectedProductId } = useProduct();
  const { data: ingestData } = useIngest();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const isMock = import.meta.env.VITE_USE_MOCK_API === "true" || !selectedProductId;

  const { data: apiData, isLoading } = useGetProductReviews(selectedProductId!, { filter }, { query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductReviewsQueryKey(selectedProductId!, { filter }) } });

  let data = apiData;
  if (!apiData && ingestData?.reviews) {
    let filteredItems = ingestData.reviews.items || [];
    if (filter === "spam") {
      filteredItems = filteredItems.filter((r: any) => r.is_spam);
    } else if (filter === "duplicates") {
      filteredItems = filteredItems.filter((r: any) => r.is_duplicate);
    } else if (filter === "ambiguous") {
      filteredItems = filteredItems.filter((r: any) => r.is_sarcastic || r.overall_sentiment === 'ambiguous');
    }
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter((r: any) => r.text?.toLowerCase().includes(lowerQuery));
    }
    
    data = {
      ...ingestData.reviews,
      items: filteredItems,
      total: filteredItems.length
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">Analyze and explore customer reviews in detail.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="spam">Spam</TabsTrigger>
            <TabsTrigger value="duplicates">Near-duplicates</TabsTrigger>
            <TabsTrigger value="ambiguous">Sarcastic/Ambiguous</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search reviews..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
            {data?.items && data.items.length > 0 ? data.items.map((review: any) => (
              <TableRow key={review.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(review.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="max-w-md truncate" title={review.text}>
                  {review.text}
                </TableCell>
                <TableCell>
                  <span className="uppercase text-xs">{review.language}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={review.overall_sentiment === 'positive' ? 'default' : review.overall_sentiment === 'negative' ? 'destructive' : 'secondary'} className={review.overall_sentiment === 'positive' ? 'bg-emerald-500 hover:bg-emerald-600' : review.overall_sentiment === 'negative' ? 'bg-rose-500 hover:bg-rose-600' : ''}>
                    {review.overall_sentiment}
                  </Badge>
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
