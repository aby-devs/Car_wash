import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { AddRecordPage } from "@/pages/AddRecordPage";
import { StaffPage } from "@/pages/StaffPage";
import { LoginPage } from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import SettingsPage from "@/pages/SettingsPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="add-record" element={<AddRecordPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/old" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
