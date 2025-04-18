import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import DownloadsPage from "@/pages/DownloadsPage";
import SeriesLibraryPage from "@/pages/SeriesLibraryPage";
import RcloneUploadPage from "@/pages/RcloneUploadPage";
import SettingsPage from "@/pages/SettingsPage";

function Router() {
  return (
    <Switch>
      {/* Define routes */}
      <Route path="/" component={HomePage} />
      <Route path="/downloads" component={DownloadsPage} />
      <Route path="/library" component={SeriesLibraryPage} />
      <Route path="/upload" component={RcloneUploadPage} />
      <Route path="/settings" component={SettingsPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
