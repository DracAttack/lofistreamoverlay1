import { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { LayerPanel } from "@/components/layout/LayerPanel";
import { AssetManager } from "@/components/layout/AssetManager";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { LayerEditor } from "@/components/layout/LayerEditor";
import { SavedLayouts } from "@/components/layout/SavedLayouts";
import { SpotifyIntegration } from "@/components/layout/SpotifyIntegration";
import { StreamInfo } from "@/components/layout/StreamInfo";
import { StreamOutput } from "@/components/stream/StreamOutput";
import { useQuery } from "@tanstack/react-query";
import { Layer } from "@/lib/types";
import { useLayoutContext } from "@/context/LayoutContext";

export default function Home() {
  const [currentView, setCurrentView] = useState<"configuration" | "output">("configuration");
  const { setLayers } = useLayoutContext();
  
  // Fetch layers from the server
  const { isLoading, data: layersData } = useQuery<Layer[]>({
    queryKey: ['/api/layers']
  });
  
  // Update layers when data changes
  useEffect(() => {
    if (layersData) {
      setLayers(layersData);
    }
  }, [layersData, setLayers]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
      
      <div className="container mx-auto pt-20 pb-10 px-4">
        {currentView === "configuration" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Layer Management */}
            <div className="lg:col-span-3 space-y-6">
              <LayerPanel />
              <AssetManager />
            </div>
            
            {/* Center Panel - Preview & Layer Editor */}
            <div className="lg:col-span-6">
              <PreviewPanel />
              <LayerEditor />
            </div>
            
            {/* Right Panel - Settings & Integrations */}
            <div className="lg:col-span-3 space-y-6">
              <SavedLayouts />
              <SpotifyIntegration />
              <StreamInfo />
            </div>
          </div>
        ) : (
          <StreamOutput />
        )}
      </div>
    </div>
  );
}
