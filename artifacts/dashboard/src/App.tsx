import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ProductProvider } from "@/contexts/ProductContext";
import { IngestProvider } from "@/contexts/IngestContext";
import { AppLayout } from "@/components/layout/app-layout";
import DashboardPage from "@/pages/dashboard";
import ReviewsPage from "@/pages/reviews";
import TrendsPage from "@/pages/trends";
import IngestPage from "@/pages/ingest";
import ComparePage from "@/pages/compare";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/reviews" component={ReviewsPage} />
        <Route path="/trends" component={TrendsPage} />
        <Route path="/ingest" component={IngestPage} />
        <Route path="/compare" component={ComparePage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProductProvider>
          <IngestProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </IngestProvider>
        </ProductProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
