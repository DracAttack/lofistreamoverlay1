import { useState, useEffect, useRef } from "react";
import { useLayoutContext } from "@/context/LayoutContext";
import { SpotifyWidget } from "../stream/SpotifyWidget";
import { QuoteOverlay } from "../stream/QuoteOverlay";
import { TimerOverlay } from "../stream/TimerOverlay";
import { VideoOverlay } from "../stream/VideoOverlay";
import { TestLayerCreator } from "../ui/test-layer-creator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

// FIXED REFERENCE DIMENSIONS
// OBS/Stream canvas is 1920x1080, use these as our base reference size
const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;

// ABSOLUTE SIZE CONSTRAINTS (in pixels)
const MIN_WIDTH_PX = 50;   // Minimum 50px width
const MIN_HEIGHT_PX = 50;  // Minimum 50px height
const MAX_WIDTH_PX = 1800; // Maximum 1800px width (within 1920px canvas)
const MAX_HEIGHT_PX = 900; // Maximum 900px height (within 1080px canvas)

// Utility functions for snapping to grid and center
function snapToGrid(value: number, step = 5): number {
  return Math.round(value / step) * step;
}

function snapToCenter(value: number, containerSize: number, threshold = 3): number {
  const center = containerSize / 2;
  const centerPercent = 50;
  
  // If within threshold of center, snap to center
  if (Math.abs(value - centerPercent) < threshold) {
    return centerPercent;
  }
  return value;
}

// Calculate percentage constraints based on fixed pixel values
const MIN_WIDTH_PERCENT = 5;  // Minimum 5% of container width
const MIN_HEIGHT_PERCENT = 5; // Minimum 5% of container height
const MAX_WIDTH_PERCENT = 90; // Maximum 90% of container width
const MAX_HEIGHT_PERCENT = 90; // Maximum 90% of container height

// History tracking for undo functionality
interface LayerHistoryEntry {
  layerId: number;
  position: {
    x: number;
    y: number;
    width: number | 'auto';
    height: number | 'auto';
    xPercent?: number;
    yPercent?: number;
    widthPercent?: number;
    heightPercent?: number;
  };
}

export function PreviewPanel() {
  const { layers, selectedLayer, setLayers, updateLayerPosition } = useLayoutContext();
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ 
    width: 0, 
    height: 0, 
    x: 0, 
    y: 0,
    widthPercent: 0,
    heightPercent: 0,
    xPercent: 0,
    yPercent: 0
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const layerHistoryRef = useRef<LayerHistoryEntry[]>([]);
  const { toast } = useToast();

  const handleFullPreview = () => {
    window.open(`/stream?aspect=${aspectRatio}`, "_blank");
  };

  const startDrag = (e: React.MouseEvent, layerId: number) => {
    if (!previewRef.current) return;
    
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Save the layer's starting position for history
    const originalPosition = { ...layer.position };
    layerHistoryRef.current.push({
      layerId,
      position: originalPosition
    });
    
    const rect = previewRef.current.getBoundingClientRect();
    
    // Calculate offset from the mouse position to the top-left corner of the element
    // This ensures smoother dragging without jumps
    const offsetX = e.clientX - rect.left - layer.position.x;
    const offsetY = e.clientY - rect.top - layer.position.y;
    
    console.log("Starting drag with position:", { 
      x: layer.position.x, 
      y: layer.position.y,
      mouseAt: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      offset: { x: offsetX, y: offsetY }
    });
    
    setIsDragging(true);
    setDragTarget(layerId);
    setDragOffset({ x: offsetX, y: offsetY });
    
    // Also update resize start values in case we switch to resize
    setResizeStart({
      width: typeof layer.position.width === 'number' ? layer.position.width : 
             (layer.position.widthPercent ? (layer.position.widthPercent / 100) * rect.width : 200),
      height: typeof layer.position.height === 'number' ? layer.position.height : 
              (layer.position.heightPercent ? (layer.position.heightPercent / 100) * rect.height : 150),
      x: layer.position.x,
      y: layer.position.y,
      widthPercent: layer.position.widthPercent || 0,
      heightPercent: layer.position.heightPercent || 0,
      xPercent: layer.position.xPercent || 0,
      yPercent: layer.position.yPercent || 0
    });
  };

  // Use a reference to track the last time we synced to avoid too many API calls
  const lastSyncTimeRef = useRef(0);
  const SYNC_THROTTLE_MS = 100; // Only sync every 100ms during active drag
  
  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging || dragTarget === null || !previewRef.current) return;
    
    const layer = layers.find(l => l.id === dragTarget);
    if (!layer) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    
    // Get the layer's dimensions with fallbacks to ensure we always have valid values
    // This is critical for preventing NaN and undefined values that cause issues
    const width = typeof layer.position.width === 'number' ? layer.position.width : 
                  (layer.position.widthPercent ? (layer.position.widthPercent / 100) * rect.width : 200);
    
    const height = typeof layer.position.height === 'number' ? layer.position.height : 
                   (layer.position.heightPercent ? (layer.position.heightPercent / 100) * rect.height : 150);
    
    // Calculate how much of the layer should remain visible when dragged to the edge
    const minVisibleWidth = Math.min(width * 0.25, 50);
    const minVisibleHeight = Math.min(height * 0.25, 50);
    
    // Get mouse position within the container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Use offset for smooth, accurate dragging (accounts for where user clicked in the element)
    const newX = mouseX - dragOffset.x;
    const newY = mouseY - dragOffset.y;
    
    // Set hard limits on where elements can be dragged
    const minX = -width + minVisibleWidth;
    const minY = -height + minVisibleHeight;
    const maxX = rect.width - minVisibleWidth;
    const maxY = rect.height - minVisibleHeight;
    
    // Enforce boundaries to prevent elements from being dragged entirely off-screen
    // These hard limits are critical for maintaining usability
    const x = Math.max(minX, Math.min(maxX, newX));
    const y = Math.max(minY, Math.min(maxY, newY));
    
    // Calculate percentage positions for cross-view compatibility
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Log drag data periodically for debugging
    if (Date.now() % 50 === 0) {
      console.log('Dragging Layer:', {
        id: layer.id,
        direction: 'drag',
        mousePosition: { x: mouseX, y: mouseY },
        dragOffset: dragOffset,
        newPosition: { x, y },
        percentages: { xPercent, yPercent }
      });
    }
    
    // Create constrained position update - keep original values for width/height
    // Apply hard caps on percentages to prevent any possibility of errors
    const constrainedPosition = {
      ...layer.position,
      x,
      y,
      xPercent: Math.max(0, Math.min(95, xPercent)),
      yPercent: Math.max(0, Math.min(95, yPercent))
    };
    
    // Update local UI immediately for responsive feel
    const updatedLayers = layers.map(l => {
      if (l.id === dragTarget) {
        return {
          ...l,
          position: constrainedPosition
        };
      }
      return l;
    });
    
    // Update UI immediately
    setLayers(updatedLayers);
    
    // Throttle the database updates during drag to avoid overwhelming the server
    const now = Date.now();
    if (now - lastSyncTimeRef.current > SYNC_THROTTLE_MS) {
      lastSyncTimeRef.current = now;
      
      // Send update to server during drag - but throttled
      // Include both pixel and percentage values for consistent cross-view rendering
      updateLayerPosition(dragTarget, constrainedPosition)
        .catch(error => {
          console.error("Error updating position during drag:", error);
        });
    }
  };

  const startResize = (e: React.MouseEvent, layerId: number, direction: string) => {
    e.stopPropagation(); // Prevent drag from starting
    
    if (!previewRef.current) return;
    
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Save the layer's starting position and dimensions for history/undo
    const originalPosition = { ...layer.position };
    layerHistoryRef.current.push({
      layerId,
      position: originalPosition
    });
    
    // Keep only the last 20 history entries
    if (layerHistoryRef.current.length > 20) {
      layerHistoryRef.current = layerHistoryRef.current.slice(-20);
    }

    const rect = previewRef.current.getBoundingClientRect();
    
    // CRITICAL: We need precise pixel values for the starting size and position
    // These values will be used as reference points for all delta calculations
    
    // For width/height, prioritize pixel values but fall back to percentages if needed
    const width = typeof layer.position.width === 'number' 
      ? layer.position.width 
      : (layer.position.widthPercent 
          ? (layer.position.widthPercent / 100) * rect.width 
          : Math.min(200, rect.width * 0.3)); // Safe default
    
    const height = typeof layer.position.height === 'number' 
      ? layer.position.height 
      : (layer.position.heightPercent 
          ? (layer.position.heightPercent / 100) * rect.height 
          : Math.min(150, rect.height * 0.3)); // Safe default
    
    // Same for positions
    const x = typeof layer.position.x === 'number' 
      ? layer.position.x 
      : (layer.position.xPercent 
          ? (layer.position.xPercent / 100) * rect.width 
          : 0);
    
    const y = typeof layer.position.y === 'number' 
      ? layer.position.y 
      : (layer.position.yPercent 
          ? (layer.position.yPercent / 100) * rect.height 
          : 0);
    
    // IMPORTANT: Apply safety clamps immediately to the starting values
    // This prevents any possibility of starting with invalid dimensions
    const safeWidth = Math.max(MIN_WIDTH_PX, Math.min(MAX_WIDTH_PX, width));
    const safeHeight = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, height));
    const safeX = Math.max(0, Math.min(rect.width - MIN_WIDTH_PX, x));
    const safeY = Math.max(0, Math.min(rect.height - MIN_HEIGHT_PX, y));
    
    console.log("Starting resize with safe dimensions:", { 
      x: safeX, 
      y: safeY, 
      width: safeWidth, 
      height: safeHeight,
      direction
    });
    
    // Cache the starting dimensions and mouse position
    // This is the critical reference point for all resize calculations
    setResizeStart({
      width: safeWidth,
      height: safeHeight,
      x: safeX,
      y: safeY,
      // Store percentages for completeness, but we'll mainly use pixel values
      widthPercent: (safeWidth / rect.width) * 100,
      heightPercent: (safeHeight / rect.height) * 100,
      xPercent: (safeX / rect.width) * 100,
      yPercent: (safeY / rect.height) * 100
    });
    
    setIsResizing(true);
    setResizeDirection(direction);
    setDragTarget(layerId);

    // Save the starting mouse position for delta calculations
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setDragOffset({ x: mouseX, y: mouseY });
  };

  const handleResize = (e: React.MouseEvent) => {
    if (!isResizing || dragTarget === null || !resizeDirection || !previewRef.current) return;
    
    const layer = layers.find(l => l.id === dragTarget);
    if (!layer) return;

    // Get current preview panel dimensions
    const rect = previewRef.current.getBoundingClientRect();
    
    // IMPORTANT: We retrieve the EXACT dimensions set during startResize
    // These are used as the base for all calculations to prevent drift
    const {
      width: startWidth,
      height: startHeight,
      x: startX,
      y: startY
    } = resizeStart;
    
    // Calculate mouse DELTA from the original position - CRITICAL for stability
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate change in position since drag started
    // This is the critical part for preventing "explosions"
    let deltaWidth = 0;
    let deltaHeight = 0;
    let deltaX = 0;
    let deltaY = 0;
    
    // Set up new position values - we'll modify these based on resize direction
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newX = startX;
    let newY = startY;
    
    console.log('Resize data:', {
      mousePos: { x: mouseX, y: mouseY },
      startDimensions: { x: startX, y: startY, width: startWidth, height: startHeight },
      direction: resizeDirection
    });
    
    // Apply direction-specific resize logic using RELATIVE MOUSE MOVEMENT
    switch (resizeDirection) {
      case 'e': // East (right edge)
        deltaWidth = mouseX - (startX + startWidth);
        newWidth = startWidth + deltaWidth;
        break;
        
      case 'w': // West (left edge)
        deltaX = mouseX - startX;
        newX = startX + deltaX;
        newWidth = startWidth - deltaX;
        break;
        
      case 's': // South (bottom edge)
        deltaHeight = mouseY - (startY + startHeight);
        newHeight = startHeight + deltaHeight;
        break;
        
      case 'n': // North (top edge)
        deltaY = mouseY - startY;
        newY = startY + deltaY;
        newHeight = startHeight - deltaY;
        break;
        
      case 'se': // Southeast (bottom-right corner)
        deltaWidth = mouseX - (startX + startWidth);
        deltaHeight = mouseY - (startY + startHeight);
        newWidth = startWidth + deltaWidth;
        newHeight = startHeight + deltaHeight;
        break;
        
      case 'sw': // Southwest (bottom-left corner)
        deltaX = mouseX - startX;
        deltaHeight = mouseY - (startY + startHeight);
        newX = startX + deltaX;
        newWidth = startWidth - deltaX;
        newHeight = startHeight + deltaHeight;
        break;
        
      case 'ne': // Northeast (top-right corner)
        deltaWidth = mouseX - (startX + startWidth);
        deltaY = mouseY - startY;
        newY = startY + deltaY;
        newWidth = startWidth + deltaWidth;
        newHeight = startHeight - deltaY;
        break;
        
      case 'nw': // Northwest (top-left corner)
        deltaX = mouseX - startX;
        deltaY = mouseY - startY;
        newX = startX + deltaX;
        newY = startY + deltaY;
        newWidth = startWidth - deltaX;
        newHeight = startHeight - deltaY;
        break;
    }
    
    // CRITICAL: Apply hard clamps to prevent any possibility of exploding sizes
    // Keep sizes within reasonable bounds in pixels (not percentages)
    newWidth = Math.max(MIN_WIDTH_PX, Math.min(MAX_WIDTH_PX, newWidth));
    newHeight = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, newHeight));
    
    // Prevent elements from being positioned outside the container
    newX = Math.max(0, Math.min(rect.width - MIN_WIDTH_PX, newX));
    newY = Math.max(0, Math.min(rect.height - MIN_HEIGHT_PX, newY));
    
    // Calculate percentage values based on the CLAMPED pixel values
    const xPercent = (newX / rect.width) * 100;
    const yPercent = (newY / rect.height) * 100;
    const widthPercent = (newWidth / rect.width) * 100;
    const heightPercent = (newHeight / rect.height) * 100;
    
    // Log resize debug info
    console.log('Final resize values:', {
      pixels: { x: newX, y: newY, width: newWidth, height: newHeight },
      percentages: { xPercent, yPercent, widthPercent, heightPercent }
    });
    
    // Create the final position object with both pixel and percentage values
    const constrainedPosition = {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      xPercent,
      yPercent,
      widthPercent,
      heightPercent
    };
    
    // Update layers with new dimensions
    const updatedLayers = layers.map(l => {
      if (l.id === dragTarget) {
        return {
          ...l,
          position: {
            ...l.position,
            ...constrainedPosition
          }
        };
      }
      return l;
    });
    
    // Update UI immediately
    setLayers(updatedLayers);
    
    // Throttle the database updates during resize to avoid overwhelming the server
    const now = Date.now();
    if (now - lastSyncTimeRef.current > SYNC_THROTTLE_MS) {
      lastSyncTimeRef.current = now;
      
      // Send update to server during resize - but throttled
      updateLayerPosition(dragTarget, constrainedPosition)
        .catch(error => {
          console.error("Error updating position during resize:", error);
        });
    }
  };

  // Reset layer to default position and size
  const resetLayer = async (layerId: number) => {
    // Find the layer to reset
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !previewRef.current) return;
    
    // Store the original position for undo history
    layerHistoryRef.current.push({
      layerId,
      position: { ...layer.position }
    });
    
    // Get container dimensions
    const rect = previewRef.current.getBoundingClientRect();
    
    // Default position: centered, 30% width, 30% height
    const defaultPosition = {
      x: rect.width / 2 - (rect.width * 0.15),
      y: rect.height / 2 - (rect.height * 0.15),
      width: rect.width * 0.3,
      height: rect.height * 0.3,
      xPercent: 35,
      yPercent: 35,
      widthPercent: 30,
      heightPercent: 30
    };
    
    // Update layers with reset position
    const updatedLayers = layers.map(l => {
      if (l.id === layerId) {
        return {
          ...l,
          position: {
            ...l.position,
            ...defaultPosition
          }
        };
      }
      return l;
    });
    
    // Update UI
    setLayers(updatedLayers);
    
    try {
      // Update server
      await updateLayerPosition(layerId, defaultPosition);
      
      toast({
        title: "Layer Reset",
        description: `Layer position and size have been reset to default`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset layer position",
        variant: "destructive"
      });
    }
  };
  
  // Undo last position change
  const undoLastChange = () => {
    if (layerHistoryRef.current.length === 0) {
      toast({
        title: "Nothing to Undo",
        description: "No recent position changes found",
      });
      return;
    }
    
    // Get the last history entry
    const lastEntry = layerHistoryRef.current.pop();
    if (!lastEntry) return;
    
    // Update the layer with the previous position
    const updatedLayers = layers.map(l => {
      if (l.id === lastEntry.layerId) {
        return {
          ...l,
          position: lastEntry.position
        };
      }
      return l;
    });
    
    // Update UI
    setLayers(updatedLayers);
    
    // Update server
    updateLayerPosition(lastEntry.layerId, lastEntry.position)
      .then(() => {
        toast({
          title: "Change Undone",
          description: `Reverted to previous position`,
        });
      })
      .catch(error => {
        toast({
          title: "Error",
          description: "Failed to undo changes",
          variant: "destructive"
        });
      });
  };

  const endResize = async () => {
    if (isResizing && dragTarget !== null) {
      const layer = layers.find(l => l.id === dragTarget);
      if (layer && previewRef.current) {
        try {
          const rect = previewRef.current.getBoundingClientRect();
          
          // Get current position values - ensure all values are defined
          let { 
            x = 0, 
            y = 0, 
            width = rect.width * 0.3, 
            height = rect.height * 0.3, 
            xPercent = 0, 
            yPercent = 0, 
            widthPercent = 30, 
            heightPercent = 30 
          } = layer.position;
          
          // CRITICAL: Apply strict size limits first to prevent invalid values
          // Apply hard constraints on percentages
          xPercent = Math.max(0, Math.min(90, xPercent));
          yPercent = Math.max(0, Math.min(90, yPercent));
          widthPercent = Math.max(MIN_WIDTH_PERCENT, Math.min(MAX_WIDTH_PERCENT, widthPercent));
          heightPercent = Math.max(MIN_HEIGHT_PERCENT, Math.min(MAX_HEIGHT_PERCENT, heightPercent));
          
          // Now perform snapping
          xPercent = snapToGrid(xPercent);
          yPercent = snapToGrid(yPercent);
          widthPercent = snapToGrid(widthPercent);
          heightPercent = snapToGrid(heightPercent);
          
          // Snap center alignment
          xPercent = snapToCenter(xPercent, 100);
          yPercent = snapToCenter(yPercent, 100);
          
          // Convert percentages to absolute pixel values
          // This ensures consistent sizing across different views
          x = (xPercent / 100) * rect.width;
          y = (yPercent / 100) * rect.height;
          
          // Ensure width and height have valid pixel values
          width = (widthPercent / 100) * rect.width;
          height = (heightPercent / 100) * rect.height;
          
          // Final safety check - avoid any possible explosions
          width = Math.min(rect.width * 0.9, width);
          height = Math.min(rect.height * 0.9, height);
          
          // Create the position object with both pixel and percentage values
          const snappedPosition = {
            x,
            y,
            width,
            height,
            xPercent,
            yPercent,
            widthPercent,
            heightPercent
          };
          
          // Update UI with snapped values
          const updatedLayers = layers.map(l => {
            if (l.id === dragTarget) {
              return {
                ...l,
                position: {
                  ...l.position,
                  ...snappedPosition
                }
              };
            }
            return l;
          });
          
          setLayers(updatedLayers);
          
          // Use the context function to update position on server with snapped values
          await updateLayerPosition(dragTarget, snappedPosition);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to update layer dimensions",
            variant: "destructive"
          });
        }
      }
    }
    
    setIsResizing(false);
    setResizeDirection(null);
    setDragTarget(null);
  };

  const endDrag = async () => {
    if (isDragging && dragTarget !== null) {
      const layer = layers.find(l => l.id === dragTarget);
      if (layer && previewRef.current) {
        try {
          const rect = previewRef.current.getBoundingClientRect();
          
          // Get current position values - ensure all values are defined with defaults
          let { 
            x = 0, 
            y = 0, 
            width = rect.width * 0.3, 
            height = rect.height * 0.3, 
            xPercent = 0, 
            yPercent = 0, 
            widthPercent = 30, 
            heightPercent = 30 
          } = layer.position;
          
          // CRITICAL: Apply strict limits to coordinates to prevent issues
          // Apply hard constraints on percentages
          xPercent = Math.max(0, Math.min(90, xPercent));
          yPercent = Math.max(0, Math.min(90, yPercent));
          
          // Snap percentages to grid (increments of 5%)
          xPercent = snapToGrid(xPercent);
          yPercent = snapToGrid(yPercent);
          
          // Snap to center if close
          xPercent = snapToCenter(xPercent, 100);
          yPercent = snapToCenter(yPercent, 100);
          
          // Convert percentages to absolute pixel values
          // This ensures consistent positioning across different views
          x = (xPercent / 100) * rect.width;
          y = (yPercent / 100) * rect.height;
          
          // Final safety check - keep element on screen
          x = Math.max(0, Math.min(rect.width - 50, x));
          y = Math.max(0, Math.min(rect.height - 50, y));
          
          // Create the final position with both pixel and percentage values
          const snappedPosition = {
            // Keep original width/height
            ...layer.position,
            // Update position with new calculated values
            x,
            y,
            xPercent,
            yPercent
          };
          
          // Update UI with snapped values
          const updatedLayers = layers.map(l => {
            if (l.id === dragTarget) {
              return {
                ...l,
                position: snappedPosition
              };
            }
            return l;
          });
          
          setLayers(updatedLayers);
          
          // Use the context function to update position on server with snapped values
          await updateLayerPosition(dragTarget, snappedPosition);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to update layer position",
            variant: "destructive"
          });
        }
      }
    }
    
    setIsDragging(false);
    setDragTarget(null);
  };

  // Add global mouse handling that works even outside the component
  useEffect(() => {
    // Global handlers to ensure drag/resize stops even if mouse leaves the component
    const globalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDrag(e as any);
      } else if (isResizing) {
        handleResize(e as any);
      }
    };
    
    const globalMouseUp = () => {
      if (isDragging) {
        endDrag();
      } else if (isResizing) {
        endResize();
      }
    };
    
    // Add event listeners to the whole document
    document.addEventListener('mousemove', globalMouseMove);
    document.addEventListener('mouseup', globalMouseUp);
    
    // Clean up
    return () => {
      document.removeEventListener('mousemove', globalMouseMove);
      document.removeEventListener('mouseup', globalMouseUp);
    };
  }, [isDragging, isResizing, dragTarget, resizeDirection]);
  
  // Set up event listeners for layer tools (reset and undo)
  useEffect(() => {
    // Handler for the reset layer event
    const handleResetLayerEvent = (e: CustomEvent) => {
      const { layerId } = e.detail;
      if (layerId) {
        resetLayer(layerId);
      }
    };
    
    // Handler for undo event
    const handleUndoEvent = () => {
      undoLastChange();
    };
    
    // Add event listeners
    window.addEventListener('resetLayer', handleResetLayerEvent as any);
    window.addEventListener('undoLastChange', handleUndoEvent);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('resetLayer', handleResetLayerEvent as any);
      window.removeEventListener('undoLastChange', handleUndoEvent);
    };
  }, [layers, setLayers]);

  const handleSaveLayout = async () => {
    const name = prompt("Enter a name for this layout:");
    if (!name) return;
    
    try {
      const layoutData = {
        name,
        layers: layers.map(layer => ({
          id: layer.id,
          position: layer.position,
          visible: layer.visible,
          zIndex: layer.zIndex
        })),
        preview: "placeholder-preview-url.jpg", // This would be replaced with actual preview
        createdAt: new Date().toISOString()
      };
      
      await apiRequest('POST', '/api/layouts', layoutData);
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      
      toast({
        title: "Layout saved",
        description: `Layout "${name}" has been saved successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save layout",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 border border-secondary/20 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg">Preview</h2>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-foreground/70">
              {aspectRatio === "16:9" ? "1920×1080" : 
               aspectRatio === "4:3" ? "1440×1080" : 
               "1080×1080"}
            </span>
            <select 
              className="bg-background text-foreground text-sm p-1 rounded border border-secondary/30"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
            </select>
          </div>
          <button 
            className="bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1 rounded text-sm transition-colors"
            onClick={handleFullPreview}
          >
            <i className="ri-fullscreen-line mr-1"></i>
            Full Preview
          </button>
          
          {/* Add Test Layer Creator for debugging position sync */}
          <TestLayerCreator />
        </div>
      </div>
      
      {/* Preview Canvas */}
      <div 
        ref={previewRef}
        className={`preview-container preview-area w-full relative overflow-hidden ${
          aspectRatio === "16:9" ? "aspect-video" : 
          aspectRatio === "4:3" ? "aspect-[4/3]" : 
          "aspect-square"
        }`}
        onMouseMove={isDragging ? handleDrag : isResizing ? handleResize : undefined}
        onMouseUp={isDragging ? endDrag : isResizing ? endResize : undefined}
        onMouseLeave={isDragging ? endDrag : isResizing ? endResize : undefined}
      >
        {layers
          .filter(layer => layer.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(layer => {
            // Check if this layer should be fullscreen
            const isFullscreen = layer.content?.isFullscreen === true;
            
            // If layer ID is 1, log details to help debug
            if (layer.id === 1) {
              console.log('Layer 1 (Preview):', {
                name: layer.name,
                source: layer.content?.source,
                fullscreen: isFullscreen,
                position: layer.position,
                visible: layer.visible
              });
            }
            
            // Use percentage-based positioning if available, otherwise fallback to pixels
            const style = {
              // If layer is fullscreen, position at 0,0 with 100% width/height
              // Otherwise, use standard coordinates
              left: isFullscreen ? '0' : (
                layer.position.xPercent ? `${layer.position.xPercent}%` : `${layer.position.x}px`
              ),
              top: isFullscreen ? '0' : (
                layer.position.yPercent ? `${layer.position.yPercent}%` : `${layer.position.y}px`
              ),
              width: isFullscreen ? '100%' : (
                layer.position.width === 'auto' ? 'auto' : 
                (layer.position.widthPercent ? `${layer.position.widthPercent}%` : `${layer.position.width}px`)
              ),
              height: isFullscreen ? '100%' : (
                layer.position.height === 'auto' ? 'auto' : 
                (layer.position.heightPercent ? `${layer.position.heightPercent}%` : `${layer.position.height}px`)
              ),
              zIndex: layer.zIndex,
              cursor: isDragging && dragTarget === layer.id ? 'grabbing' : 'grab',
              position: 'absolute' as 'absolute',
            };

            return (
              <div 
                key={layer.id} 
                style={style}
                onMouseDown={(e) => startDrag(e, layer.id)}
                className={`${selectedLayer?.id === layer.id ? 'outline outline-2 outline-primary' : ''}`}
              >
                {/* Content based on asset type */}
                {layer.content.timerEnabled ? (
                  // Timer overlay
                  <TimerOverlay
                    style={layer.style}
                    timerConfig={{
                      duration: layer.content.timerDuration || 300,
                      direction: layer.content.timerDirection || 'down',
                      startTime: layer.content.timerStartTime,
                      format: layer.content.timerFormat || 'mm:ss'
                    }}
                    preview={true}
                  />
                ) : layer.content.source ? (
                  <>
                    {/\.(mp4|webm|ogg|mov)$/i.test(layer.content.source) ? (
                      // Video content with scheduling support
                      <VideoOverlay
                        style={{
                          ...layer.style,
                          // Force transparent background for WebM videos
                          backgroundColor: /\.webm$/i.test(layer.content.source) ? 'transparent' : layer.style.backgroundColor
                        }}
                        source={layer.content.source}
                        loop={layer.content.scheduleLoop !== false} // default to true
                        autoplay={true}
                        muted={true}
                        preview={true}
                        schedule={{
                          enabled: layer.content.scheduleEnabled || false,
                          interval: layer.content.scheduleInterval || 600,
                          duration: layer.content.scheduleDuration || 5,
                          autoHide: layer.content.scheduleAutoHide !== false // default to true
                        }}
                      />
                    ) : /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(layer.content.source) ? (
                      // Image content
                      <div
                        style={{
                          backgroundColor: layer.style.backgroundColor || 'transparent',
                          borderRadius: layer.style.borderRadius || '0',
                          overflow: 'hidden',
                          height: '100%',
                          width: '100%',
                        }}
                      >
                        <img 
                          src={layer.content.source} 
                          alt={`Layer ${layer.id}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: isFullscreen ? 'cover' : 'contain'
                          }}
                        />
                      </div>
                    ) : (
                      // Default for other content types
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          backgroundColor: layer.style.backgroundColor || 'rgba(0,0,0,0.5)',
                          borderRadius: layer.style.borderRadius || '0',
                        }}
                      >
                        <p style={{ color: layer.style.textColor || '#fff' }}>
                          {layer.name}
                        </p>
                      </div>
                    )}
                  </>
                ) : isFullscreen ? (
                  // Fullscreen layer with no content
                  <div 
                    className="w-full h-full"
                    style={{ backgroundColor: layer.style.backgroundColor || '#111' }}
                  />
                ) : (
                  // Empty layer
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      backgroundColor: layer.style.backgroundColor || 'rgba(0,0,0,0.5)',
                      borderRadius: layer.style.borderRadius || '0',
                    }}
                  >
                    <p style={{ color: layer.style.textColor || '#fff' }}>
                      {layer.name}
                    </p>
                  </div>
                )}

                {/* Resize handles for selected layers (hide for fullscreen layers) */}
                {selectedLayer?.id === layer.id && !isFullscreen && (
                  <>
                    {/* Layer label */}
                    <div className="absolute -top-6 left-0 bg-primary text-xs text-white px-2 py-1 rounded">
                      Layer #{layer.id}: {layer.name}
                    </div>

                    {/* Resize handles */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize bg-primary/30 hover:bg-primary/50" 
                      onMouseDown={(e) => startResize(e, layer.id, 'e')}
                    ></div>
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize bg-primary/30 hover:bg-primary/50"
                      onMouseDown={(e) => startResize(e, layer.id, 'w')}
                    ></div>
                    <div 
                      className="absolute top-0 left-0 right-0 h-3 cursor-n-resize bg-primary/30 hover:bg-primary/50"
                      onMouseDown={(e) => startResize(e, layer.id, 'n')}
                    ></div>
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize bg-primary/30 hover:bg-primary/50"
                      onMouseDown={(e) => startResize(e, layer.id, 's')}
                    ></div>
                    
                    {/* Corner resize handles */}
                    <div 
                      className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize bg-primary/50 hover:bg-primary/70"
                      onMouseDown={(e) => startResize(e, layer.id, 'ne')}
                    ></div>
                    <div 
                      className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize bg-primary/50 hover:bg-primary/70"
                      onMouseDown={(e) => startResize(e, layer.id, 'nw')}
                    ></div>
                    <div 
                      className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-primary/50 hover:bg-primary/70"
                      onMouseDown={(e) => startResize(e, layer.id, 'se')}
                    ></div>
                    <div 
                      className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize bg-primary/50 hover:bg-primary/70"
                      onMouseDown={(e) => startResize(e, layer.id, 'sw')}
                    ></div>
                  </>
                )}
              </div>
            );
          })}
      </div>
      
      {/* Preview Controls with tooltips */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <button 
              className="text-foreground/70 hover:text-foreground transition-colors"
              onClick={() => {
                if (selectedLayer) {
                  resetLayer(selectedLayer.id);
                } else {
                  toast({
                    title: "No Layer Selected",
                    description: "Please select a layer first",
                  });
                }
              }}
            >
              <i className="ri-focus-2-line text-xl"></i>
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
              Center selected layer
            </div>
          </div>
          
          <div className="relative group">
            <button 
              className="text-foreground/70 hover:text-foreground transition-colors"
              onClick={() => {
                toast({
                  title: "Snap to Grid",
                  description: "All layers will snap to grid when moved",
                });
              }}
            >
              <i className="ri-grid-line text-xl"></i>
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
              Toggle grid snapping
            </div>
          </div>
          
          <div className="relative group">
            <button 
              className="text-foreground/70 hover:text-foreground transition-colors"
              onClick={undoLastChange}
            >
              <i className="ri-arrow-go-back-line text-xl"></i>
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
              Undo last change
            </div>
          </div>
        </div>
        <div>
          <button 
            className="bg-primary text-card font-medium px-4 py-1.5 rounded hover:bg-primary/90 transition-colors"
            onClick={handleSaveLayout}
          >
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
}
