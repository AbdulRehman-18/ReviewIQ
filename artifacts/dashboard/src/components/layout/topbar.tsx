import { useProduct } from "@/contexts/ProductContext";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function Topbar() {
  const { selectedProductId } = useProduct();
  const [location] = useLocation();
  
  const getPageName = () => {
    if (location === "/") return "Overview";
    if (location === "/reviews") return "Reviews";
    if (location === "/trends") return "Trends";
    if (location === "/ingest") return "Ingestion";
    if (location === "/compare") return "Compare";
    return "Dashboard";
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{getPageName()}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">OL</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">Last 7 days</Button>
        <Button variant="outline" size="sm">All models</Button>
      </div>
    </header>
  );
}
