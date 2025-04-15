import { useState, useEffect } from "react";
import { useLayoutContext } from "@/context/LayoutContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Quote } from "@/lib/types";
import { AssetSelector } from "./AssetSelector";

export function LayerEditor() {
  const { selectedLayer, setLayers, layers } = useLayoutContext();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState<{ width: number | 'auto', height: number | 'auto' }>({ width: 0, height: 0 });
  const [style, setStyle] = useState({ 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    textColor: '#00FFFF',
    borderRadius: '8px',
    backdropBlur: 'backdrop-blur-sm'
  });
  const [zIndex, setZIndex] = useState(0);
  const [sourceOption, setSourceOption] = useState("");
  const [rotationInterval, setRotationInterval] = useState(30);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(300); // 5 minutes default
  const [timerDirection, setTimerDirection] = useState<'up' | 'down'>('down');
  const [timerFormat, setTimerFormat] = useState<'hh:mm:ss' | 'mm:ss' | 'ss'>('mm:ss');
  
  // Scheduling options
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(600); // 10 minutes default
  const [scheduleDuration, setScheduleDuration] = useState(5); // 5 seconds default
  const [scheduleAutoHide, setScheduleAutoHide] = useState(true);
  const [scheduleLoop, setScheduleLoop] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();
  
  // Fetch quotes for the quote selector
  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
    enabled: selectedLayer?.type === 'quote',
  });

  useEffect(() => {
    if (selectedLayer) {
      console.log("LayerEditor - Loading selectedLayer:", selectedLayer);
      
      setPosition({ 
        x: selectedLayer.position.x || 0, 
        y: selectedLayer.position.y || 0 
      });
      setSize({ 
        width: selectedLayer.position.width !== undefined ? selectedLayer.position.width : 300, 
        height: selectedLayer.position.height !== undefined ? selectedLayer.position.height : 200 
      });
      setStyle({
        backgroundColor: selectedLayer.style.backgroundColor || 'rgba(0,0,0,0.75)',
        textColor: selectedLayer.style.textColor || '#00FFFF',
        borderRadius: selectedLayer.style.borderRadius || '8px',
        backdropBlur: selectedLayer.style.backdropBlur || 'backdrop-blur-sm'
      });
      setZIndex(selectedLayer.zIndex || 10);
      
      // Check if layer is currently in fullscreen mode (all percentages set to 0/100)
      const isLayerFullscreen = 
        selectedLayer.position.xPercent === 0 && 
        selectedLayer.position.yPercent === 0 && 
        selectedLayer.position.widthPercent === 100 && 
        selectedLayer.position.heightPercent === 100;
      
      setIsFullscreen(isLayerFullscreen);
      
      // Explicitly handle the source properly
      const currentSource = selectedLayer.content?.source || "";
      console.log("LayerEditor - Setting sourceOption from layer:", currentSource);
      setSourceOption(currentSource);
      
      setRotationInterval(selectedLayer.content?.rotationInterval || 30);
      
      // Load timer settings
      setTimerEnabled(selectedLayer.content?.timerEnabled || false);
      setTimerDuration(selectedLayer.content?.timerDuration || 300);
      setTimerDirection(selectedLayer.content?.timerDirection || 'down');
      setTimerFormat(selectedLayer.content?.timerFormat || 'mm:ss');
      
      // Load scheduling settings
      // Make sure we load scheduling information properly
      setScheduleEnabled(selectedLayer.content?.scheduleEnabled === true);
      setScheduleInterval(selectedLayer.content?.scheduleInterval || 600);
      setScheduleDuration(selectedLayer.content?.scheduleDuration || 5);
      setScheduleAutoHide(selectedLayer.content?.scheduleAutoHide !== false); // default to true
      setScheduleLoop(selectedLayer.content?.scheduleLoop !== false); // default to true
      
      // Debug log
      console.log("LayerEditor - Loading schedule settings:", {
        enabled: selectedLayer.content?.scheduleEnabled,
        interval: selectedLayer.content?.scheduleInterval,
        duration: selectedLayer.content?.scheduleDuration,
        autoHide: selectedLayer.content?.scheduleAutoHide,
        loop: selectedLayer.content?.scheduleLoop
      });
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

    // Debug the asset selection
    console.log("LayerEditor - Save - Current sourceOption:", sourceOption);
    console.log("LayerEditor - Save - selectedLayer content:", selectedLayer.content);
    
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
          rotationInterval,
          timerEnabled,
          timerDuration,
          timerDirection,
          timerFormat,
          timerStartTime: timerDirection === 'up' ? new Date().toISOString() : undefined,
          
          // Scheduling options
          scheduleEnabled,
          scheduleInterval,
          scheduleDuration,
          scheduleAutoHide,
          scheduleLoop
        },
        zIndex
      };
      
      // Debug the final updated layer
      console.log("LayerEditor - Save - Final updatedLayer:", updatedLayer);
      
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
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-foreground/70">Asset Selection</label>
        </div>
        
        {/* Asset Selector */}
        <AssetSelector
          selectedAsset={sourceOption}
          onAssetSelect={(assetPath) => {
            console.log("LayerEditor - Asset selected:", assetPath);
            setSourceOption(assetPath);
          }}
        />
      </div>

      {/* Timer Settings */}
      <div className="mb-4 border-t border-secondary/30 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="font-semibold text-sm">Timer Settings</label>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-foreground/70">Enable Timer</span>
            <input 
              type="checkbox" 
              checked={timerEnabled} 
              onChange={(e) => setTimerEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-secondary"
            />
          </div>
        </div>
        
        {timerEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Duration (seconds)</label>
              <input 
                type="number" 
                value={timerDuration} 
                onChange={(e) => setTimerDuration(parseInt(e.target.value, 10) || 0)}
                min="1"
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Direction</label>
              <select 
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
                value={timerDirection}
                onChange={(e) => setTimerDirection(e.target.value as 'up' | 'down')}
              >
                <option value="down">Count Down</option>
                <option value="up">Count Up</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-foreground/70 mb-1">Display Format</label>
              <select 
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
                value={timerFormat}
                onChange={(e) => setTimerFormat(e.target.value as 'hh:mm:ss' | 'mm:ss' | 'ss')}
              >
                <option value="hh:mm:ss">Hours:Minutes:Seconds (00:00:00)</option>
                <option value="mm:ss">Minutes:Seconds (00:00)</option>
                <option value="ss">Seconds Only (00)</option>
              </select>
            </div>
            
            <div className="col-span-2 mt-2 bg-background/50 rounded p-2 text-xs text-foreground/70">
              {timerDirection === 'down' ? (
                <p>Timer will count down from {timerDuration} seconds to 0.</p>
              ) : (
                <p>Timer will count up from 0 seconds when the stream starts.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scheduling Options */}
      <div className="mb-4 border-t border-secondary/30 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="font-semibold text-sm">Playback Schedule</label>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-foreground/70">Enable Scheduling</span>
            <input 
              type="checkbox" 
              checked={scheduleEnabled} 
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-secondary"
            />
          </div>
        </div>
        
        {scheduleEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Show every (seconds)</label>
              <input 
                type="number" 
                value={scheduleInterval} 
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  console.log("Setting scheduleInterval:", value);
                  setScheduleInterval(value || 60);
                }}
                min="1"
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
              <span className="text-xs text-foreground/50 mt-1 block">
                {Math.floor(scheduleInterval / 60)} min {scheduleInterval % 60} sec
              </span>
            </div>
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Show for (seconds)</label>
              <input 
                type="number" 
                value={scheduleDuration} 
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  console.log("Setting scheduleDuration:", value);
                  setScheduleDuration(value || 5);
                }}
                min="1"
                className="w-full bg-background border border-secondary/30 rounded px-2 py-1 text-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={scheduleAutoHide} 
                onChange={(e) => {
                  console.log("Setting scheduleAutoHide:", e.target.checked);
                  setScheduleAutoHide(e.target.checked);
                }}
                className="h-4 w-4 rounded border-secondary"
              />
              <label className="text-xs text-foreground/70">Auto-hide when inactive</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={scheduleLoop} 
                onChange={(e) => setScheduleLoop(e.target.checked)}
                className="h-4 w-4 rounded border-secondary"
              />
              <label className="text-xs text-foreground/70">Loop playback</label>
            </div>
            
            <div className="col-span-2 mt-2 bg-background/50 rounded p-2 text-xs text-foreground/70">
              {scheduleAutoHide ? (
                <p>
                  {scheduleLoop ? 
                    `Content will play ${scheduleDuration} seconds every ${scheduleInterval} seconds, and loop while visible.` :
                    `Content will play once for ${scheduleDuration} seconds every ${scheduleInterval} seconds, then hide.`
                  }
                </p>
              ) : (
                <p>
                  {scheduleLoop ?
                    `Content will always be visible and restart playback every ${scheduleInterval} seconds.` : 
                    `Content will always be visible and play once every ${scheduleInterval} seconds.`
                  }
                </p>
              )}
            </div>
          </div>
        )}
      </div>

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