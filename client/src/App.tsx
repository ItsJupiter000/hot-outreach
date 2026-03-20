import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import NewOutreach from "@/pages/NewOutreach";
import Applications from "@/pages/Applications";
import Templates from "@/pages/Templates";
import Documents from "@/pages/Documents";
import FollowUp from "@/pages/FollowUp";
import Analytics from "@/pages/Analytics";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/new" component={NewOutreach} />
      <Route path="/applications" component={Applications} />
      <Route path="/templates" component={Templates} />
      <Route path="/documents" component={Documents} />
      <Route path="/followup" component={FollowUp} />
      <Route path="/analytics" component={Analytics} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
