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
  const { setLayers } = useLayoutContext();
  const [isConnected, setIsConnected] = useState(false);
  
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
  }, [setLayers]);

  // Get aspect ratio from query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aspect = params.get('aspect');
    
    // Add aspect ratio to document as a data-attribute
    if (aspect) {
      document.documentElement.setAttribute('data-aspect-ratio', aspect);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {!isConnected && !isLoading && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center p-2 z-50">
          WebSocket disconnected. Layouts may not update in real-time.
        </div>
      )}
      <StreamOutput />
    </div>
  );
}
