import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ProductProvider } from "@/contexts/ProductContext";
import { IngestProvider } from "@/contexts/IngestContext";
import { AppLayout } from "@/components/layout/app-layout";
import DashboardPage from "@/pages/dashboard";
import ReviewsPage from "@/pages/reviews";
import FeaturesPage from "@/pages/features";
import TrendsPage from "@/pages/trends";
import IngestPage from "@/pages/ingest";
import ComparePage from "@/pages/compare";
import ModerationPage from "@/pages/moderation";

const PAGE_TRANSITION = {
  initial:    { opacity: 0, y: 8  },
  animate:    { opacity: 1, y: 0  },
  exit:       { opacity: 0, y: -8 },
  transition: { duration: 0.18, ease: "easeInOut" as const },
};

function Router() {
  const [location] = useLocation();

  return (
    <AppLayout>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={location} {...PAGE_TRANSITION} className="h-full">
          <Switch>
            <Route path="/"           component={DashboardPage}  />
            <Route path="/reviews"    component={ReviewsPage}    />
            <Route path="/features"   component={FeaturesPage}   />
            <Route path="/trends"     component={TrendsPage}     />
            <Route path="/ingest"     component={IngestPage}     />
            <Route path="/compare"    component={ComparePage}    />
            <Route path="/moderation" component={ModerationPage} />
            <Route component={NotFound} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}

function App() {
  return (
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
  );
}

export default App;
