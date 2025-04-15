import { useState, useEffect, useRef } from "react";
import { useLayoutContext } from "@/context/LayoutContext";
import { SpotifyWidget } from "../stream/SpotifyWidget";
import { QuoteOverlay } from "../stream/QuoteOverlay";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function PreviewPanel() {
  const { layers, selectedLayer, setLayers } = useLayoutContext();
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFullPreview = () => {
    window.open("/stream", "_blank");
  };

  const startDrag = (e: React.MouseEvent, layerId: number) => {
    if (!previewRef.current) return;
    
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - layer.position.x;
    const offsetY = e.clientY - rect.top - layer.position.y;
    
    setIsDragging(true);
    setDragTarget(layerId);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging || dragTarget === null || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 10, e.clientX - rect.left - dragOffset.x));
    const y = Math.max(0, Math.min(rect.height - 10, e.clientY - rect.top - dragOffset.y));
    
    const updatedLayers = layers.map(layer => {
      if (layer.id === dragTarget) {
        return {
          ...layer,
          position: {
            ...layer.position,
            x,
            y
          }
        };
      }
      return layer;
    });
    
    setLayers(updatedLayers);
  };

  const startResize = (e: React.MouseEvent, layerId: number, direction: string) => {
    e.stopPropagation(); // Prevent drag from starting
    
    if (!previewRef.current) return;
    
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    setIsResizing(true);
    setResizeDirection(direction);
    setDragTarget(layerId);

    // Set drag offset for calculations
    const rect = previewRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleResize = (e: React.MouseEvent) => {
    if (!isResizing || dragTarget === null || !resizeDirection || !previewRef.current) return;
    
    const layer = layers.find(l => l.id === dragTarget);
    if (!layer) return;

    const rect = previewRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Calculate new dimensions based on resize direction
    let newWidth = typeof layer.position.width === 'number' ? layer.position.width : 200;
    let newHeight = typeof layer.position.height === 'number' ? layer.position.height : 150;
    let newX = layer.position.x;
    let newY = layer.position.y;
    
    if (resizeDirection.includes('e')) { // East (right)
      newWidth = Math.max(50, currentX - layer.position.x);
    }
    if (resizeDirection.includes('w')) { // West (left)
      const width = typeof layer.position.width === 'number' ? layer.position.width : 200;
      const right = layer.position.x + width;
      newWidth = Math.max(50, right - currentX);
      newX = currentX;
    }
    if (resizeDirection.includes('s')) { // South (bottom)
      newHeight = Math.max(50, currentY - layer.position.y);
    }
    if (resizeDirection.includes('n')) { // North (top)
      const height = typeof layer.position.height === 'number' ? layer.position.height : 150;
      const bottom = layer.position.y + height;
      newHeight = Math.max(50, bottom - currentY);
      newY = currentY;
    }
    
    // Update layers with new dimensions
    const updatedLayers = layers.map(l => {
      if (l.id === dragTarget) {
        return {
          ...l,
          position: {
            ...l.position,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
          }
        };
      }
      return l;
    });
    
    setLayers(updatedLayers);
  };

  const endResize = async () => {
    if (isResizing && dragTarget !== null) {
      const layer = layers.find(l => l.id === dragTarget);
      if (layer) {
        try {
          await apiRequest("PUT", `/api/layers/${dragTarget}`, {
            position: layer.position
          });
          queryClient.invalidateQueries({ queryKey: ['/api/layers'] });
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
      if (layer) {
        try {
          await apiRequest("PUT", `/api/layers/${dragTarget}`, {
            position: layer.position
          });
          queryClient.invalidateQueries({ queryKey: ['/api/layers'] });
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

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag as any);
      document.addEventListener('mouseup', endDrag);
      
      return () => {
        document.removeEventListener('mousemove', handleDrag as any);
        document.removeEventListener('mouseup', endDrag);
      };
    }
  }, [isDragging, dragTarget]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize as any);
      document.addEventListener('mouseup', endResize);
      
      return () => {
        document.removeEventListener('mousemove', handleResize as any);
        document.removeEventListener('mouseup', endResize);
      };
    }
  }, [isResizing, dragTarget, resizeDirection]);

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
      
      await apiRequest("POST", "/api/layouts", layoutData);
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
        </div>
      </div>
      
      {/* Preview Canvas */}
      <div 
        ref={previewRef}
        className={`preview-area w-full relative overflow-hidden ${
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
            // Special case for the first layer (background)
            const isBackground = layer === layers.filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex)[0];
            
            const style = {
              left: `${layer.position.x}px`,
              top: `${layer.position.y}px`,
              width: layer.position.width === 'auto' ? 'auto' : `${layer.position.width}px`,
              height: layer.position.height === 'auto' ? 'auto' : `${layer.position.height}px`,
              zIndex: layer.zIndex,
              cursor: isDragging && dragTarget === layer.id ? 'grabbing' : 'grab',
              position: 'absolute' as 'absolute',
            };

            return (
              <div 
                key={layer.id} 
                style={isBackground ? { ...style, left: '0', top: '0', width: '100%', height: '100%' } : style}
                onMouseDown={(e) => startDrag(e, layer.id)}
                className={`${selectedLayer?.id === layer.id ? 'outline outline-2 outline-primary' : ''}`}
              >
                {/* Content based on asset type */}
                {layer.content.source ? (
                  <>
                    {/\.(mp4|webm|ogg|mov)$/i.test(layer.content.source) ? (
                      // Video content
                      <video 
                        src={layer.content.source}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: isBackground ? 'cover' : 'contain',
                          backgroundColor: layer.style.backgroundColor || 'transparent',
                          borderRadius: layer.style.borderRadius || '0',
                        }}
                        autoPlay
                        loop
                        muted
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
                            objectFit: isBackground ? 'cover' : 'contain'
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
                ) : isBackground ? (
                  // Empty background layer
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

                {/* Resize handles for selected layers */}
                {selectedLayer?.id === layer.id && !isBackground && (
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
      
      {/* Preview Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-4">
          <button className="text-foreground/70 hover:text-foreground transition-colors">
            <i className="ri-focus-2-line text-xl"></i>
          </button>
          <button className="text-foreground/70 hover:text-foreground transition-colors">
            <i className="ri-grid-line text-xl"></i>
          </button>
          <button className="text-foreground/70 hover:text-foreground transition-colors">
            <i className="ri-ruler-line text-xl"></i>
          </button>
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
