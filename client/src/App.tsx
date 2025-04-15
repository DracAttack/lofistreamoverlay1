import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Stream from "@/pages/stream";
import { LayoutProvider } from "./context/LayoutContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/stream" component={Stream} />
      <Route path="/spotify-connected">
        {() => {
          window.close(); // Close the popup after Spotify connection
          return <div>Spotify Connected! You can close this window.</div>;
        }}
      </Route>
      <Route path="/spotify-error">
        {() => <div>Spotify Connection Error! Please try again.</div>}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LayoutProvider>
        <Router />
        <Toaster />
      </LayoutProvider>
    </QueryClientProvider>
  );
}

export default App;
