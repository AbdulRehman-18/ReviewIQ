import { useState, useEffect } from "react";
import { useProduct } from "@/contexts/ProductContext";
import { useIngest } from "@/contexts/IngestContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Download, Sun, Moon, CalendarDays } from "lucide-react";

const DEFAULT_PRODUCTS = [
  { id: 1, name: "Nexus Wireless Earbuds" },
  { id: 2, name: "AeroGlide Running Shoes" },
  { id: 3, name: "Aura Smartwatch" },
];

const PAGE_NAMES: Record<string, string> = {
  "/":           "Dashboard",
  "/reviews":    "Reviews Queue",
  "/features":   "Feature Analysis",
  "/trends":     "Trends",
  "/ingest":     "Ingestion",
  "/compare":    "Compare",
  "/moderation": "Moderation",
};

function getToday() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Topbar() {
  const { selectedProductId } = useProduct();
  const { products } = useIngest();
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(true);
  const [exported, setExported] = useState(false);

  // Sync with actual <html> class on mount
  useEffect(() => {

  }, []);


  function handleExport() {
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  const displayProducts = products.length > 0 ? products : DEFAULT_PRODUCTS;
  const activeProduct = displayProducts.find(p => p.id === selectedProductId) ?? displayProducts[0];
  const pageName = PAGE_NAMES[location] ?? "Dashboard";

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background flex items-center justify-between px-5 gap-4">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground text-[13px]">
                ReviewIQ
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-[13px] font-medium">{pageName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {activeProduct && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/50">
            <span className="text-[12px] font-medium text-foreground/90 truncate max-w-[160px]">
              {activeProduct.name}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium border-l border-border/60 pl-1.5">
              FMCG · Analytics
            </span>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Date range */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-[12px] text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none">
          <CalendarDays className="w-3.5 h-3.5" />
          Jan 1, 2025 – {getToday()}
        </div>


        {/* Export */}
        <Button
          size="sm"
          className="h-8 gap-1.5 text-[12.5px] font-medium"
          onClick={handleExport}
        >
          <Download className="w-3.5 h-3.5" />
          {exported ? "Exported!" : "Export Report"}
        </Button>
      </div>
    </header>
  );
}
