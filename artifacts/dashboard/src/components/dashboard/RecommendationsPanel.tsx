import { AlertTriangle, ArrowRight, CheckCircle2, Info, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { EmergingIssue } from "@workspace/api-client-react";

type Priority = "critical" | "high" | "medium" | "low";

interface Recommendation {
  id: number;
  priority: Priority;
  title: string;
  description: string;
  feature: string;
  action: string;
}

const PRIORITY_CONFIG: Record<Priority, {
  color: string;
  bg: string;
  Icon: typeof AlertCircle;
}> = {
  critical: { color: "text-rose-500",   bg: "bg-rose-500/8 border border-rose-500/20",    Icon: AlertCircle  },
  high:     { color: "text-orange-500", bg: "bg-orange-500/8 border border-orange-500/20", Icon: AlertTriangle },
  medium:   { color: "text-amber-500",  bg: "bg-amber-500/8 border border-amber-500/20",   Icon: Info         },
  low:      { color: "text-blue-500",   bg: "bg-blue-500/8 border border-blue-500/20",     Icon: CheckCircle2 },
};

const SEVERITY_ACTION: Record<string, string> = {
  critical: "Escalate",
  high:     "Investigate",
  medium:   "Review",
  low:      "Monitor",
};

const SEVERITY_TITLE: Record<string, (feature: string, from: number, to: number) => string> = {
  critical: (f, from, to) => `Inspect ${f} — negative spike ${from}% → ${to}%`,
  high:     (f, from, to) => `${f} performance degrading (${from}% → ${to}%)`,
  medium:   (f)           => `${f} showing a sustained negative trend`,
  low:      (f)           => `${f} quality dip — monitor closely`,
};

const DUMMY_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 1, priority: "critical",
    title: "Inspect supplier batch #A2-44",
    description: "Battery swelling complaints spiked 43% this week — possible manufacturing defect detected.",
    feature: "Battery", action: "Escalate",
  },
  {
    id: 2, priority: "high",
    title: "Review packaging materials",
    description: "28 customers reported damaged items on arrival. Packaging durability dropped to 2.1/5.",
    feature: "Packaging", action: "Investigate",
  },
  {
    id: 3, priority: "medium",
    title: "Delivery SLA breach detected",
    description: "Average delivery time increased from 3.2 to 5.8 days. Satisfaction down 12%.",
    feature: "Delivery", action: "Review",
  },
  {
    id: 4, priority: "low",
    title: "Update product description",
    description: "15 recent reviews mention a mismatch between listed and actual product features.",
    feature: "Documentation", action: "Update",
  },
];

function mapIssuesToRecommendations(issues: EmergingIssue[]): Recommendation[] {
  return issues.map((issue, i) => ({
    id: i + 1,
    priority: issue.severity as Priority,
    title: SEVERITY_TITLE[issue.severity]?.(issue.feature, issue.from_pct, issue.to_pct) ?? issue.feature,
    description: issue.description,
    feature: issue.feature,
    action: SEVERITY_ACTION[issue.severity] ?? "Review",
  }));
}

interface RecommendationsPanelProps {
  issues?: EmergingIssue[];
  recommendations?: Recommendation[];
}

export function RecommendationsPanel({ issues, recommendations }: RecommendationsPanelProps) {
  const items: Recommendation[] =
    issues && issues.length > 0
      ? mapIssuesToRecommendations(issues)
      : (recommendations ?? DUMMY_RECOMMENDATIONS);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prioritized Recommendations</CardTitle>
        <CardDescription>Automated actions generated from sentiment analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <AnimatePresence initial={false}>
          {items.map((rec, i) => {
            const { color, bg, Icon } = PRIORITY_CONFIG[rec.priority];
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25, delay: i * 0.06 }}
                className={`flex items-start gap-3 p-3 rounded-lg ${bg}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{rec.title}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                      {rec.feature}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.description}</p>
                </div>

                <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0 text-xs gap-1">
                  {rec.action}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
