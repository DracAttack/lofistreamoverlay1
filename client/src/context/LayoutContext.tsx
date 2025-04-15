import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Layer } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

interface LayoutContextProps {
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  selectedLayer: Layer | null;
  setSelectedLayer: React.Dispatch<React.SetStateAction<Layer | null>>;
  updateLayerPosition: (layerId: number, position: Partial<Layer['position']>) => Promise<void>;
}

const LayoutContext = createContext<LayoutContextProps | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/overlay`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established for layout synchronization');
      setWsConnection(ws);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle different message types
        if (message.type === 'layer_updated') {
          setLayers(prevLayers => 
            prevLayers.map(layer => 
              layer.id === message.data.id ? message.data : layer
            )
          );
          
          // Update selected layer if it's the one that changed
          if (selectedLayer && selectedLayer.id === message.data.id) {
            setSelectedLayer(message.data);
          }
        } 
        else if (message.type === 'layer_created') {
          setLayers(prevLayers => [...prevLayers, message.data]);
        } 
        else if (message.type === 'layer_deleted') {
          setLayers(prevLayers => prevLayers.filter(layer => layer.id !== message.data.id));
          if (selectedLayer && selectedLayer.id === message.data.id) {
            setSelectedLayer(null);
          }
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
      setWsConnection(null);
    };
    
    return () => {
      ws.close();
    };
  }, [selectedLayer]);

  // Helper function to update layer position on server and broadcast to other clients
  const updateLayerPosition = async (layerId: number, position: Partial<Layer['position']>) => {
    try {
      const layerToUpdate = layers.find(layer => layer.id === layerId);
      if (!layerToUpdate) return;

      // Update the layer locally first
      const updatedLayer = {
        ...layerToUpdate,
        position: {
          ...layerToUpdate.position,
          ...position
        }
      };

      // Update local state
      setLayers(prevLayers => 
        prevLayers.map(layer => 
          layer.id === layerId ? updatedLayer : layer
        )
      );

      // Send update to server
      await apiRequest(`/api/layers/${layerId}`, {
        method: 'PUT',
        body: JSON.stringify({ position: updatedLayer.position })
      });
    } catch (error) {
      console.error('Failed to update layer position:', error);
    }
  };

  return (
    <LayoutContext.Provider
      value={{
        layers,
        setLayers,
        selectedLayer,
        setSelectedLayer,
        updateLayerPosition
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}
