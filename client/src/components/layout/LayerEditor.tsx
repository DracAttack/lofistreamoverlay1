import { useState, useEffect } from "react";
import { useLayoutContext } from "@/context/LayoutContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Quote } from "@/lib/types";

export function LayerEditor() {
  const { selectedLayer, setLayers, layers } = useLayoutContext();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [style, setStyle] = useState({ 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    textColor: '#00FFFF',
    borderRadius: '8px'
  });
  const [zIndex, setZIndex] = useState(0);
  const [sourceOption, setSourceOption] = useState("");
  const [rotationInterval, setRotationInterval] = useState(30);
  const { toast } = useToast();
  
  // Fetch quotes for the quote selector
  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
    enabled: selectedLayer?.type === 'quote',
  });

  useEffect(() => {
    if (selectedLayer) {
      setPosition({ 
        x: selectedLayer.position.x || 0, 
        y: selectedLayer.position.y || 0 
      });
      setSize({ 
        width: selectedLayer.position.width || 300, 
        height: selectedLayer.position.height || 200 
      });
      setStyle({
        backgroundColor: selectedLayer.style.backgroundColor || 'rgba(0,0,0,0.75)',
        textColor: selectedLayer.style.textColor || '#00FFFF',
        borderRadius: selectedLayer.style.borderRadius || '8px'
      });
      setZIndex(selectedLayer.zIndex || 10);
      setSourceOption(selectedLayer.content?.source || "");
      setRotationInterval(selectedLayer.content?.rotationInterval || 30);
    }
  }, [selectedLayer]);

  const handlePositionChange = (axis: 'x' | 'y', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setPosition({ ...position, [axis]: numValue });
    }
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
    if (value === 'auto') {
      setSize({ ...size, [dimension]: 'auto' });
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        setSize({ ...size, [dimension]: numValue });
      }
    }
  };

  const handleStyleChange = (property: string, value: string) => {
    setStyle({ ...style, [property]: value });
  };

  const handleZIndexChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setZIndex(numValue);
    }
  };

  const handleSave = async () => {
    if (!selectedLayer) return;

    try {
      const updatedLayer = {
        ...selectedLayer,
        position: {
          ...selectedLayer.position,
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height
        },
        style: {
          ...selectedLayer.style,
          ...style
        },
        content: {
          ...selectedLayer.content,
          source: sourceOption,
          rotationInterval
        },
        zIndex
      };
      
      // Update the layer in the API
      await apiRequest("PUT", `/api/layers/${selectedLayer.id}`, updatedLayer);
      
      // Update local state
      setLayers(layers.map(layer => 
        layer.id === selectedLayer.id ? updatedLayer : layer
      ));
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/layers'] });
      
      toast({
        title: "Success",
        description: "Layer updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update layer",
        variant: "destructive"
      });
    }
  };

  if (!selectedLayer) {
    return (
      <div className="bg-card rounded-lg p-4 border border-secondary/20">
        <div className="text-center py-8 text-foreground/50">
          <p>Select a layer to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-secondary/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg">
          Edit Layer: <span className="text-primary">{selectedLayer.name}</span>
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-foreground/70">ID: {selectedLayer.id}</span>
          <button className="text-foreground/70 hover:text-foreground transition-colors">
            <i className="ri-more-2-fill"></i>
          </button>
        </div>
      </div>
      
      {/* Position & Size Controls */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-foreground/70 mb-1">Position</label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-xs text-foreground/50 mb-1">X</label>
              <input 
                type="text" 
                value={`${position.x}px`} 
                onChange={(e) => handlePositionChange('x', e.target.value.replace('px', ''))}
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-foreground/50 mb-1">Y</label>
              <input 
                type="text" 
                value={`${position.y}px`} 
                onChange={(e) => handlePositionChange('y', e.target.value.replace('px', ''))}
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-foreground/70 mb-1">Size</label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-xs text-foreground/50 mb-1">W</label>
              <input 
                type="text" 
                value={typeof size.width === 'number' ? `${size.width}px` : size.width} 
                onChange={(e) => handleSizeChange('width', e.target.value.replace('px', ''))}
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-foreground/50 mb-1">H</label>
              <input 
                type="text" 
                value={typeof size.height === 'number' ? `${size.height}px` : size.height} 
                onChange={(e) => handleSizeChange('height', e.target.value.replace('px', ''))}
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Style Controls */}
      {selectedLayer.type !== 'background' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-foreground/70 mb-1">Background</label>
            <div className="flex space-x-2 items-center">
              <div 
                className="w-6 h-6 border border-foreground/20 rounded"
                style={{ backgroundColor: style.backgroundColor }}
              ></div>
              <input 
                type="text" 
                value={style.backgroundColor} 
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="flex-1 bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-foreground/70 mb-1">Text Color</label>
            <div className="flex space-x-2 items-center">
              <div 
                className="w-6 h-6 border border-foreground/20 rounded"
                style={{ backgroundColor: style.textColor }}
              ></div>
              <input 
                type="text" 
                value={style.textColor} 
                onChange={(e) => handleStyleChange('textColor', e.target.value)}
                className="flex-1 bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs text-foreground/70 mb-1">Border Radius</label>
          <input 
            type="text" 
            value={style.borderRadius} 
            onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
            className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-foreground/70 mb-1">Blur Effect</label>
          <select 
            className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
            value={style.backdropBlur || 'backdrop-blur-sm'}
            onChange={(e) => handleStyleChange('backdropBlur', e.target.value)}
          >
            <option value="backdrop-blur-sm">backdrop-blur-sm</option>
            <option value="backdrop-blur-md">backdrop-blur-md</option>
            <option value="backdrop-blur-lg">backdrop-blur-lg</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-foreground/70 mb-1">z-index</label>
          <input 
            type="number" 
            value={zIndex} 
            onChange={(e) => handleZIndexChange(e.target.value)}
            className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      
      {/* Content Controls */}
      {selectedLayer.type === 'quote' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-foreground/70">Content Source</label>
            <button className="text-xs text-primary hover:text-primary/80 transition-colors">
              Edit source
            </button>
          </div>
          <select 
            className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
            value={sourceOption}
            onChange={(e) => setSourceOption(e.target.value)}
          >
            <option value="">All Quotes</option>
            {quotes.map(quote => (
              <option key={quote.id} value={quote.id.toString()}>
                {quote.text.substring(0, 30)}...
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Animation Controls */}
      {selectedLayer.type === 'quote' && (
        <div>
          <label className="block text-xs text-foreground/70 mb-1">Rotation Interval</label>
          <div className="flex items-center space-x-2">
            <input 
              type="range" 
              min="5" 
              max="60" 
              value={rotationInterval} 
              onChange={(e) => setRotationInterval(parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <span className="text-sm">{rotationInterval}s</span>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button 
          className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
          onClick={handleSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
