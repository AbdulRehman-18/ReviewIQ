import { useProduct } from "@/contexts/ProductContext";
import { useIngest } from "@/contexts/IngestContext";
import { useGetProductOverview, useGetProductFeatures, useGetEmergingIssues, getGetProductOverviewQueryKey, getGetProductFeaturesQueryKey, getGetEmergingIssuesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Filter, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

export default function DashboardPage() {
  const { selectedProductId } = useProduct();
  const { data: ingestData } = useIngest();
  const isMock = import.meta.env.VITE_USE_MOCK_API === "true" || !selectedProductId;

  const { data: apiOverview } = useGetProductOverview(selectedProductId!, { query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductOverviewQueryKey(selectedProductId!) } });
  const { data: apiFeatures } = useGetProductFeatures(selectedProductId!, { query: { enabled: !isMock && !!selectedProductId, queryKey: getGetProductFeaturesQueryKey(selectedProductId!) } });
  const { data: apiIssues } = useGetEmergingIssues(selectedProductId!, { query: { enabled: !isMock && !!selectedProductId, queryKey: getGetEmergingIssuesQueryKey(selectedProductId!) } });

  const overview = apiOverview || ingestData.overview;
  const features = apiFeatures || ingestData.features;
  const issues = apiIssues || ingestData.issues;

  const metrics = [
    { label: "Total Reviews", value: overview?.total_reviews?.toLocaleString() || "0", change: "+12%", up: true },
    { label: "Valid Reviews", value: overview?.valid_reviews?.toLocaleString() || "0", change: "+10%", up: true },
    { label: "Positive %", value: `${((overview?.overall_sentiment?.positive ?? 0)).toFixed(1)}%`, change: "+2%", up: true },
    { label: "Negative %", value: `${((overview?.overall_sentiment?.negative ?? 0)).toFixed(1)}%`, change: "-1%", up: false },
    { label: "Sarcasm %", value: `${((overview?.overall_sentiment?.sarcasm ?? 0)).toFixed(1)}%`, change: "+1%", up: false },
    { label: "Emerging Issues", value: overview?.emerging_issues_count?.toString() || "0", change: "+1", up: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Product performance and customer sentiment summary.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="likes">Likes</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{m.value}</div>
              <p className={`text-xs flex items-center mt-1 ${m.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                {m.up ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {m.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Sentiment Trends</CardTitle>
              <CardDescription>See how customer sentiment evolved during the reporting period</CardDescription>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" className="h-8 shadow-sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  Daily
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
               </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ingestData.trends || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  tickFormatter={(value) => {
                     const date = new Date(value);
                     if (isNaN(date.getTime())) return value;
                     return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                  }}
                  className="text-xs text-muted-foreground"
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  className="text-xs text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '14px' }}
                  labelStyle={{ fontSize: '14px', fontWeight: '500', color: 'hsl(var(--foreground))', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="positive_pct" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  name="Positive %" 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="negative_pct" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  name="Negative %" 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#ef4444' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sarcasm_pct" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  name="Sarcasm %" 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="bots_pct" 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  name="Bot Activity %" 
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#8b5cf6' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Language Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(overview?.language_breakdown || {}).map(([lang, count]) => (
                <div key={lang} className="flex items-center justify-between">
                  <span className="text-sm font-medium uppercase">{lang}</span>
                  <span className="text-sm text-muted-foreground">{count.toLocaleString()} reviews</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Sentiment</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={features} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="feature" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="positive_pct" stackId="a" fill="hsl(var(--chart-4))" name="Positive %" />
                  <Bar dataKey="neutral_pct" stackId="a" fill="hsl(var(--muted-foreground))" name="Neutral %" />
                  <Bar dataKey="negative_pct" stackId="a" fill="hsl(var(--chart-5))" name="Negative %" />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Emerging Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issues && issues.length > 0 ? issues.map((issue, i) => (
                <div key={i} className="flex items-start justify-between border-b pb-4 last:border-0">
                  <div>
                    <h4 className="text-sm font-medium">{issue.feature}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>{issue.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{issue.from_pct}% → {issue.to_pct}%</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No emerging issues tracked.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
