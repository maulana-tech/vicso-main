import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { wagmiConfig } from "@/lib/wagmiConfig";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import TokenAnalyzer from "./pages/TokenAnalyzer";
import SmartMoney from "./pages/SmartMoney";
import WalletDetail from "./pages/WalletDetail";
import Alerts from "./pages/Alerts";
import Trading from "./pages/Trading";
import SettingsPage from "./pages/Settings";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import AICommandCenter from "./pages/AICommandCenter";
import NotFound from "./pages/NotFound";
import Portfolio from "./pages/Portfolio";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="*"
                element={
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/trading" element={<Trading />} />
                      <Route path="/ai" element={<AICommandCenter />} />
                      <Route path="/analyzer" element={<TokenAnalyzer />} />
                      <Route path="/smart-money" element={<SmartMoney />} />
                      <Route path="/smart-money/:address" element={<WalletDetail />} />
                      <Route path="/portfolio" element={<Portfolio />} />
                      <Route path="/alerts" element={<Alerts />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
