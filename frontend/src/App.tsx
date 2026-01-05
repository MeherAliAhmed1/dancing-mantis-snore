import React, { useState } from "react"; // Import useState
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { AuthCallback } from "./pages/AuthCallback";
import { SettingsPage } from "./pages/SettingsPage"; // Import SettingsPage
import { AuthContextProvider, useAuth } from "./contexts/AuthContext";
import { Header } from "./components/Header";
import { Loader2 } from "lucide-react"; // Import Loader2 here

const queryClient = new QueryClient();

// Component to handle conditional rendering based on auth status
const AppContent = () => {
  const { isLoggedIn, isLoading } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0); // State for notification count

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <p className="text-lg">Loading authentication...</p>
      </div>
    );
  }

  return (
    <>
      {isLoggedIn && <Header notificationCount={notificationCount} />} {/* Pass notificationCount to Header */}
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/register" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route
          path="/dashboard"
          element={isLoggedIn ? <Dashboard onNotificationCountChange={setNotificationCount} /> : <Navigate to="/login" replace />} // Pass setter to Dashboard
        />
        <Route path="/settings" element={isLoggedIn ? <SettingsPage /> : <Navigate to="/login" replace />} /> {/* New Settings Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <AuthContextProvider>
          <AppContent />
        </AuthContextProvider>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;