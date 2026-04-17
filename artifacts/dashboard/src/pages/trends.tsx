import { useProduct } from "@/contexts/ProductContext";
import { useGetProductTrends, getGetProductTrendsQueryKey } from "@workspace/api-client-react";
import { mockTrends } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function TrendsPage() {
  const { selectedProductId } = useProduct();
  const isMock = import.meta.env.VITE_USE_MOCK_API === "true" || !selectedProductId;

  const { data: trends = mockTrends, isLoading } = useGetProductTrends(selectedProductId!, {}, { query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductTrendsQueryKey(selectedProductId!, {}) } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
          <p className="text-muted-foreground">Track feature sentiment over time.</p>
        </div>
        <Select defaultValue="25">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Window Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 Days</SelectItem>
            <SelectItem value="50">50 Days</SelectItem>
            <SelectItem value="100">100 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Negative % Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="negative_pct" stroke="hsl(var(--chart-5))" strokeWidth={2} name="Negative %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
