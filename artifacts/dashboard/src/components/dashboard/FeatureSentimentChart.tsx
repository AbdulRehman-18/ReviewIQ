import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

export interface FeatureData {
  feature: string;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

const DUMMY_FEATURES: FeatureData[] = [
  { feature: "Battery",      positive_pct: 65, neutral_pct: 20, negative_pct: 15 },
  { feature: "Packaging",    positive_pct: 45, neutral_pct: 30, negative_pct: 25 },
  { feature: "Delivery",     positive_pct: 55, neutral_pct: 25, negative_pct: 20 },
  { feature: "Build Quality",positive_pct: 70, neutral_pct: 18, negative_pct: 12 },
  { feature: "Sound",        positive_pct: 80, neutral_pct: 12, negative_pct:  8 },
];

const COLORS = {
  positive: "#10b981",
  neutral:  "hsl(var(--muted-foreground))",
  negative: "#ef4444",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: "8px",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
};

type ChartType = "bar" | "radar";

interface FeatureSentimentChartProps {
  data?: FeatureData[];
}

export function FeatureSentimentChart({ data = DUMMY_FEATURES }: FeatureSentimentChartProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Feature Sentiment</CardTitle>
          <CardDescription>Positive / Neutral / Negative breakdown per feature</CardDescription>
        </div>
        <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <TabsList className="h-8">
            <TabsTrigger value="bar"   className="text-xs px-3">Bar</TabsTrigger>
            <TabsTrigger value="radar" className="text-xs px-3">Radar</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="h-[300px]">
        <AnimatePresence mode="wait">
          {chartType === "bar" ? (
            <motion.div
              key="bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted-foreground) / 0.15)" />
                  <XAxis type="number" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis dataKey="feature" type="category" width={90} tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="positive_pct" stackId="a" fill={COLORS.positive} name="Positive %" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="neutral_pct"  stackId="a" fill={COLORS.neutral}  name="Neutral %"  />
                  <Bar dataKey="negative_pct" stackId="a" fill={COLORS.negative} name="Negative %" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div
              key="radar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                  <PolarGrid stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <PolarAngleAxis dataKey="feature" className="text-xs" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Positive %" dataKey="positive_pct" stroke={COLORS.positive} fill={COLORS.positive} fillOpacity={0.25} />
                  <Radar name="Negative %" dataKey="negative_pct" stroke={COLORS.negative} fill={COLORS.negative} fillOpacity={0.25} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
