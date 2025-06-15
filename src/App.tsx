import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { store } from './store';
import { initializeAuth } from './store/slices/authSlice';
import { setOnlineStatus } from './store/slices/uiSlice';
import socketService from './services/socketService';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";

const queryClient = new QueryClient();

const AppContent = () => {
  useEffect(() => {
    // Initialize auth from localStorage
    store.dispatch(initializeAuth());

    // Setup online/offline listeners
    const handleOnline = () => store.dispatch(setOnlineStatus(true));
    const handleOffline = () => store.dispatch(setOnlineStatus(false));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize WebSocket connection if authenticated
    const state = store.getState();
    if (state.auth.isAuthenticated && state.auth.token) {
      socketService.connect(state.auth.token);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      socketService.disconnect();
    };
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <AuthGuard>
              <Index />
            </AuthGuard>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  </Provider>
);

export default App;
