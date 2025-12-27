import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import LeadsKanban from "./pages/LeadsKanban";
import Leads from "./pages/Leads";
import LeadCategories from "./pages/LeadCategories";
import FlowBuilder from "./pages/FlowBuilder";
import SavedFlows from "./pages/SavedFlows";
import Remarketing from "./pages/Remarketing";
import Campanhas from "./pages/Campanhas";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import LeadRegistration from "./pages/LeadRegistration";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Integrations from "./pages/Integrations"; // [NEW]
import Financeiro from "./pages/Financeiro";
import Subscription from "./pages/Subscription";
import LandingPage from "./pages/LandingPage"; // [NEW] // [NEW]

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              import LandingPage from "./pages/LandingPage"; // [NEW]

              // ... inside Routes
              <Route path="/inicio" element={<LandingPage />} /> // [NEW]
              <Route path="/subscription" element={<AppLayout><Subscription /></AppLayout>} />
              <Route path="/auth" element={<Auth />} />

              {/* App Routes with Layout */}
              <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/live-chat" element={<AppLayout><LeadsKanban /></AppLayout>} />
              <Route path="/leads" element={<AppLayout><Leads /></AppLayout>} />
              <Route path="/lead-categories" element={<AppLayout><LeadCategories /></AppLayout>} />
              <Route path="/flows" element={<AppLayout><FlowBuilder /></AppLayout>} />
              <Route path="/saved-flows" element={<AppLayout><SavedFlows /></AppLayout>} />
              <Route path="/remarketing" element={<AppLayout><Remarketing /></AppLayout>} />
              <Route path="/campanhas" element={<AppLayout><Campanhas /></AppLayout>} />
              <Route path="/products" element={<AppLayout><Products /></AppLayout>} />
              <Route path="/suppliers" element={<AppLayout><Suppliers /></AppLayout>} />
              <Route path="/orders" element={<AppLayout><Orders /></AppLayout>} />
              <Route path="/integrations" element={<AppLayout><Integrations /></AppLayout>} />
              <Route path="/financeiro" element={<AppLayout><Financeiro /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
              <Route path="/admin" element={<Admin />} />

              {/* Catch-all */}
              <Route path="/subscription" element={<AppLayout><Subscription /></AppLayout>} /> // [NEW] Subscription
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
