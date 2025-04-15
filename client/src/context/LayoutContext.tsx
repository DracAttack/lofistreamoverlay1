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
  // Set up WebSocket connection for real-time updates - runs ONLY once on component mount
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
          setLayers(prevLayers => {
            // Check if this layer already exists to prevent duplicates
            const layerExists = prevLayers.some(layer => layer.id === message.data.id);
            if (!layerExists) return prevLayers; // Skip if it doesn't exist (shouldn't happen)
            
            return prevLayers.map(layer => 
              layer.id === message.data.id ? message.data : layer
            );
          });
          
          // Update selected layer if it's the one that changed - using a callback
          setSelectedLayer(currentSelectedLayer => {
            if (currentSelectedLayer && currentSelectedLayer.id === message.data.id) {
              return message.data;
            }
            return currentSelectedLayer;
          });
        } 
        else if (message.type === 'layer_created') {
          setLayers(prevLayers => {
            // Check if this layer already exists to prevent duplicates
            const layerExists = prevLayers.some(layer => layer.id === message.data.id);
            if (layerExists) return prevLayers; // Skip if already exists
            
            return [...prevLayers, message.data];
          });
        } 
        else if (message.type === 'layer_deleted') {
          setLayers(prevLayers => prevLayers.filter(layer => layer.id !== message.data.id));
          
          setSelectedLayer(currentSelectedLayer => {
            if (currentSelectedLayer && currentSelectedLayer.id === message.data.id) {
              return null;
            }
            return currentSelectedLayer;
          });
        }
        // Handle active layout updates from other clients
        else if (message.type === 'active_layout_updated') {
          if (Array.isArray(message.data)) {
            console.log('Received active layout update via WebSocket:', message.data);
            
            // Deduplicate layers by ID before setting
            const safeLayerData = message.data as Layer[];
            const uniqueLayers = Array.from(
              new Map(safeLayerData.map(layer => [layer.id, layer])).values()
            ) as Layer[];
            
            setLayers(uniqueLayers);
            
            // Update selected layer using a callback to avoid dependency on selectedLayer
            setSelectedLayer(currentSelectedLayer => {
              if (!currentSelectedLayer) return currentSelectedLayer;
              
              const updatedSelectedLayer = uniqueLayers.find(
                layer => layer.id === currentSelectedLayer.id
              );
              
              return updatedSelectedLayer || currentSelectedLayer;
            });
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
  }, []); // Empty dependency array - only run once on mount

  // Helper function to update layer position on server and broadcast to other clients
  const updateLayerPosition = async (layerId: number, position: Partial<Layer['position']>) => {
    try {
      const layerToUpdate = layers.find(layer => layer.id === layerId);
      if (!layerToUpdate) return;

      // Don't make unnecessary updates if the position hasn't changed
      if (Object.entries(position).every(([key, value]) => 
        layerToUpdate.position[key as keyof Layer['position']] === value
      )) {
        return;
      }

      // BASE RESOLUTION CONSTANTS for normalized coordinate system
      const BASE_WIDTH = 1920;
      const BASE_HEIGHT = 1080;
      
      // Calculate percentage values based on standard 1920x1080 resolution
      // This ensures consistency between different viewport sizes
      let positionWithPercentages = { ...position };
      
      // Get the container element for calculating percentages
      const container = document.querySelector('.preview-container') as HTMLElement;
      if (container && position) {
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        
        // Calculate normalized percentage values based on the container dimensions
        // This makes positions relative to a standard 1920x1080 grid
        
        // Calculate xPercent if x is provided (as % of normalized 1920x1080 space)
        if (position.x !== undefined && containerWidth > 0) {
          const normalizedX = (position.x / containerWidth) * 100;
          positionWithPercentages.xPercent = normalizedX;
          // We now store both the percentage and the absolute pixel value at 1920x1080 resolution
          positionWithPercentages.x = (normalizedX / 100) * BASE_WIDTH;
        }
        
        // Calculate yPercent if y is provided (as % of normalized 1920x1080 space)
        if (position.y !== undefined && containerHeight > 0) {
          const normalizedY = (position.y / containerHeight) * 100;
          positionWithPercentages.yPercent = normalizedY;
          // We now store both the percentage and the absolute pixel value at 1920x1080 resolution
          positionWithPercentages.y = (normalizedY / 100) * BASE_HEIGHT;
        }
        
        // Calculate widthPercent if width is provided and not 'auto'
        if (position.width !== undefined && position.width !== 'auto' && containerWidth > 0) {
          const normalizedWidth = (Number(position.width) / containerWidth) * 100;
          positionWithPercentages.widthPercent = normalizedWidth;
          // Store both percentage and the absolute pixel value at 1920x1080 resolution
          positionWithPercentages.width = (normalizedWidth / 100) * BASE_WIDTH;
        }
        
        // Calculate heightPercent if height is provided and not 'auto'
        if (position.height !== undefined && position.height !== 'auto' && containerHeight > 0) {
          const normalizedHeight = (Number(position.height) / containerHeight) * 100;
          positionWithPercentages.heightPercent = normalizedHeight;
          // Store both percentage and the absolute pixel value at 1920x1080 resolution
          positionWithPercentages.height = (normalizedHeight / 100) * BASE_HEIGHT;
        }
        
        console.log('Normalized position values:', {
          original: position,
          normalized: positionWithPercentages,
          containerDimensions: { width: containerWidth, height: containerHeight }
        });
      }

      // Update the layer locally first with both absolute and percentage values
      const updatedLayer = {
        ...layerToUpdate,
        position: {
          ...layerToUpdate.position,
          ...positionWithPercentages
        }
      };

      // Update local state immediately for responsive UI
      setLayers(prevLayers => 
        prevLayers.map(layer => layer.id === layerId ? updatedLayer : layer)
      );

      console.log(`Updating layer position with percentages:`, positionWithPercentages);
      
      // Use active layout sync to avoid race conditions
      // This keeps positions in sync across all views through a single source of truth
      try {
        // Get fresh copy of layers with the updated layer
        const currentLayers = layers.map(layer => 
          layer.id === layerId ? updatedLayer : layer
        );
        
        // Single API call to update all layers with the calculated percentages
        await apiRequest('POST', '/api/active-layout/sync', {
          layers: currentLayers
        });
        
        // If direct layer update is also needed to persist changes
        await apiRequest('PUT', `/api/layers/${layerId}`, updatedLayer);
        
      } catch (apiError) {
        console.error('API error while updating position:', apiError);
        // If the server update fails, revert the local change
        setLayers(prevLayers => [...prevLayers]);
      }
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
