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
        onMouseMove={isDragging ? handleDrag : undefined}
        onMouseUp={isDragging ? endDrag : undefined}
        onMouseLeave={isDragging ? endDrag : undefined}
      >
        {layers
          .filter(layer => layer.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(layer => {
            const style = {
              left: `${layer.position.x}px`,
              top: `${layer.position.y}px`,
              width: layer.position.width ? `${layer.position.width}px` : 'auto',
              height: layer.position.height ? `${layer.position.height}px` : 'auto',
              zIndex: layer.zIndex,
              backgroundColor: layer.type === 'background' ? 'transparent' : undefined,
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
                {layer.type === 'background' && (
                  <div className="absolute inset-0 bg-blue-500/20">
                    <span className="absolute left-2 top-2 text-sm">Background</span>
                  </div>
                )}
                
                {layer.type === 'quote' && (
                  <QuoteOverlay 
                    style={layer.style}
                    preview={true}
                  />
                )}
                
                {layer.type === 'spotify' && (
                  <SpotifyWidget 
                    style={layer.style}
                    preview={true}
                  />
                )}
                
                {layer.type === 'logo' && (
                  <div className="text-xs text-accent font-mono text-center p-4 bg-black/50 rounded">
                    <i className="ri-focus-3-line text-xl"></i>
                    <div>Logo Placeholder</div>
                  </div>
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
