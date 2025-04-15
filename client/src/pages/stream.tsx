import { useEffect } from "react";
import { StreamOutput } from "@/components/stream/StreamOutput";
import { useQuery } from "@tanstack/react-query";
import { Layer } from "@/lib/types";
import { useLayoutContext } from "@/context/LayoutContext";
import { queryClient } from "@/lib/queryClient";

export default function Stream() {
  const { setLayers } = useLayoutContext();
  
  // Fetch layers from the server
  const { isLoading, data: layersData } = useQuery<Layer[]>({
    queryKey: ['/api/layers']
  });

  useEffect(() => {
    if (layersData) {
      setLayers(layersData);
    }
  }, [layersData, setLayers]);

  // Set up websocket for real-time updates if needed
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/overlay`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle different message types
        if (message.type === 'layer_updated' || message.type === 'layer_created' || message.type === 'layer_deleted') {
          // Refresh layers data when changes are detected
          queryClient.invalidateQueries({ queryKey: ['/api/layers'] });
        } else if (message.type === 'quote_updated' || message.type === 'quote_created' || message.type === 'quote_deleted') {
          // Refresh quotes data when changes are detected
          queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
        } else if (message.type === 'spotify_settings_updated') {
          // Refresh Spotify settings when changes are detected
          queryClient.invalidateQueries({ queryKey: ['/api/spotify/settings'] });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <StreamOutput />
    </div>
  );
}
