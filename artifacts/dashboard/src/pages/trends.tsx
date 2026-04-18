import { useIngest } from "@/contexts/IngestContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { useState, useMemo } from "react";
import { UploadCloud } from "lucide-react";
import { useLocation } from "wouter";

export default function TrendsPage() {
  const { data: ingestData } = useIngest();
  const [, setLocation] = useLocation();
  const [windowSize, setWindowSize] = useState("25");

  const allTrends: any[] = ingestData?.trends ?? [];
  const trends = useMemo(
    () => allTrends.slice(-parseInt(windowSize)),
    [allTrends, windowSize]
  );

  const hasData = allTrends.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
          <p className="text-muted-foreground">Track feature sentiment over time.</p>
        </div>
        <Select defaultValue={windowSize} onValueChange={setWindowSize}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Window Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 Days</SelectItem>
            <SelectItem value="14">14 Days</SelectItem>
            <SelectItem value="25">25 Days</SelectItem>
            <SelectItem value="50">50 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hasData ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <UploadCloud className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-base font-medium text-muted-foreground">No trend data yet</p>
          <p className="text-sm text-muted-foreground/70">
            Go to{" "}
            <button className="underline text-primary" onClick={() => setLocation("/ingest")}>
              Ingestion
            </button>{" "}
            to analyze your reviews.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Over Time</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.15)" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
                    }}
                    className="text-xs"
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }} />
                  <Line type="monotone" dataKey="positive_pct" stroke="#10b981" strokeWidth={2} name="Positive %" dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="negative_pct" stroke="#ef4444" strokeWidth={2} name="Negative %" dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="sarcasm_pct"  stroke="#f59e0b" strokeWidth={2} name="Sarcasm %"  dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="bots_pct"     stroke="#8b5cf6" strokeWidth={2} name="Bot Activity %" strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Negative % Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
                    }}
                    className="text-xs"
                  />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="negative_pct"
                    stroke="hsl(var(--chart-5))"
                    strokeWidth={2}
                    name="Negative %"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
