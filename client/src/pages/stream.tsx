import { useEffect, useState } from "react";
import { StreamOutput } from "@/components/stream/StreamOutput";
import { useQuery } from "@tanstack/react-query";
import { Layer } from "@/lib/types";
import { useLayoutContext } from "@/context/LayoutContext";
import { queryClient } from "@/lib/queryClient";

interface ActiveLayout {
  id: number;
  layers: Layer[];
  updatedAt: string;
}

export default function Stream() {
  console.log("Stream page rendering...");
  
  // CRITICAL FIX: We need to access BOTH layers and setLayers from context
  const { layers, setLayers } = useLayoutContext();
  const [isConnected, setIsConnected] = useState(false);
  
  // Debug what's in context right now (this is critical)
  console.log("Stream page - layers in context:", layers ? layers.length : 'UNDEFINED', 
    layers ? layers.map(l => ({id: l.id, name: l.name})) : 'No layers');
  
  // Hard-code a test layer to see if we can force something to appear
  useEffect(() => {
    if (!layers || layers.length === 0) {
      console.log("CRITICAL - No layers found, setting a test layer");
      
      // Create a test layer for debugging - use 'background' type to match schema
      const testLayer = {
        id: 999,
        name: "TEST LAYER",
        type: "background" as const, // Must match one of the allowed types in the schema
        position: {
          x: 100,
          y: 100,
          width: 400,
          height: 200,
          xPercent: 5,
          yPercent: 9, 
          widthPercent: 20,
          heightPercent: 18
        },
        style: {
          backgroundColor: "rgba(255, 0, 0, 0.5)",
          textColor: "#ffffff",
          borderRadius: "8px",
          backdropBlur: "none"
        },
        content: {
          text: "This is a test layer to debug rendering issues"
        },
        zIndex: 999,
        visible: true
      };
      
      // Try to force a layer to appear
      setLayers([testLayer as Layer]);
    }
  }, [layers, setLayers]);
    
    // Fetch active layout from the server
    const { isLoading, data: activeLayoutData } = useQuery<ActiveLayout>({
      queryKey: ['/api/active-layout'],
      refetchInterval: 5000, // Refetch every 5 seconds as a fallback
    });

  // Use active layout data when available
  useEffect(() => {
    if (activeLayoutData && activeLayoutData.layers) {
      console.log("Stream page: received active layout data:", activeLayoutData.layers);
      setLayers(activeLayoutData.layers);
    }
  }, [activeLayoutData, setLayers]);

  // Set up websocket for real-time updates
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/overlay`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Stream page: WebSocket connection established');
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle different message types
        if (message.type === 'active_layout_updated') {
          // Apply the layout directly from WebSocket
          if (Array.isArray(message.data)) {
            console.log('Stream page: Received active layout update via WebSocket:', message.data);
            setLayers(message.data);
          }
        } 
        else if (message.type === 'layer_updated' || message.type === 'layer_created' || message.type === 'layer_deleted') {
          // Refresh layers data when changes are detected
          queryClient.invalidateQueries({ queryKey: ['/api/active-layout'] });
        } 
        else if (message.type === 'quote_updated' || message.type === 'quote_created' || message.type === 'quote_deleted') {
          // Refresh quotes data when changes are detected
          queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
        } 
        else if (message.type === 'spotify_settings_updated') {
          // Refresh Spotify settings when changes are detected
          queryClient.invalidateQueries({ queryKey: ['/api/spotify/settings'] });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, [setLayers, queryClient]);

  // Get aspect ratio from query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aspect = params.get('aspect');
    
    // Add aspect ratio to document as a data-attribute
    if (aspect) {
      document.documentElement.setAttribute('data-aspect-ratio', aspect);
    }
  }, []);

  // Add a class to body element to ensure proper styling
  useEffect(() => {
    document.body.classList.add('stream-page');
    
    return () => {
      document.body.classList.remove('stream-page');
    };
  }, []);
  
  // Extract aspect ratio from query parameters
  const getAspectRatio = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('aspect') || '16:9';
  };
  
  // Direct debugging of layers
  console.log("STREAM PAGE RENDER - layers:", layers); 

  return (
    <div className="stream-container w-full h-screen flex items-center justify-center bg-black overflow-hidden">
      {!isConnected && !isLoading && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center p-2 z-50">
          WebSocket disconnected. Layouts may not update in real-time.
        </div>
      )}
      
      {/* CRITICAL: Display a red box if no layers are available */}
      {(!layers || layers.length === 0) && (
        <div className="fixed top-16 left-0 right-0 bg-red-600 text-white text-center p-2 z-50">
          CRITICAL ERROR: No layers available in the LayoutContext - Check console for details
        </div>
      )}
      
      {/* The StreamOutput component now uses the LayoutContext directly */}
      <StreamOutput aspectRatio={getAspectRatio()} />
    </div>
  );
}
