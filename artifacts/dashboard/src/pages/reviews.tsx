import { useProduct } from "@/contexts/ProductContext";
import { useGetProductReviews, getGetProductReviewsQueryKey } from "@workspace/api-client-react";
import { mockReviews } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useState } from "react";

export default function ReviewsPage() {
  const { selectedProductId } = useProduct();
  const [filter, setFilter] = useState("all");
  
  const isMock = import.meta.env.VITE_USE_MOCK_API === "true" || !selectedProductId;

  const { data = mockReviews, isLoading } = useGetProductReviews(selectedProductId!, { filter }, { query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductReviewsQueryKey(selectedProductId!, { filter }) } });

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
          <Input placeholder="Search reviews..." className="pl-8" />
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
            {data?.items.map((review) => (
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
                    {review.features.map((f, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {f.feature}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
