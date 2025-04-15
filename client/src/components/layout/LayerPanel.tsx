import { DragHandle } from "@/components/ui/drag-handle";
import { useLayoutContext } from "@/context/LayoutContext";
import { Layer } from "@/lib/types";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function LayerPanel() {
  const { layers, setLayers, setSelectedLayer } = useLayoutContext();
  const { toast } = useToast();
  const [addingLayer, setAddingLayer] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerType, setNewLayerType] = useState("quote");

  const handleSelectLayer = (layer: Layer) => {
    setSelectedLayer(layer);
  };

  const handleToggleVisibility = async (layerId: number, visible: boolean) => {
    try {
      const updatedLayers = layers.map(layer => 
        layer.id === layerId ? { ...layer, visible: !visible } : layer
      );
      setLayers(updatedLayers);
      
      await apiRequest("PUT", `/api/layers/${layerId}`, { visible: !visible });
      queryClient.invalidateQueries({ queryKey: ['/api/layers'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update layer visibility",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteLayer = async (layerId: number) => {
    if (!confirm("Are you sure you want to delete this layer? This action cannot be undone.")) {
      return;
    }
    
    try {
      await apiRequest("DELETE", `/api/layers/${layerId}`);
      
      // Update local state
      const filteredLayers = layers.filter(layer => layer.id !== layerId);
      setLayers(filteredLayers);
      
      // Clear selected layer if it was deleted
      setSelectedLayer((prev) => prev?.id === layerId ? null : prev);
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['/api/layers'] });
      
      toast({
        title: "Success",
        description: "Layer deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete layer",
        variant: "destructive"
      });
    }
  };

  const handleAddLayer = async () => {
    if (!newLayerName.trim()) {
      toast({
        title: "Error",
        description: "Layer name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const defaultPosition = { x: 50, y: 50, width: 300, height: 200 };
      let defaultStyle = { backgroundColor: 'rgba(0, 0, 0, 0.75)', textColor: '#00FFFF', borderRadius: '8px' };
      let defaultContent = { source: '' };
      let zIndex = layers.length + 10;

      const response = await apiRequest("POST", "/api/layers", {
        name: newLayerName,
        type: newLayerType,
        position: defaultPosition,
        style: defaultStyle,
        content: defaultContent,
        zIndex,
        visible: true
      });

      const newLayer = await response.json();
      setLayers([...layers, newLayer]);
      setAddingLayer(false);
      setNewLayerName("");
      setNewLayerType("quote");
      
      queryClient.invalidateQueries({ queryKey: ['/api/layers'] });
      
      toast({
        title: "Success",
        description: "Layer added successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add layer",
        variant: "destructive"
      });
    }
  };

  const renderLayerTypeIcon = (type: string) => {
    switch (type) {
      case "background":
        return <i className="ri-movie-line text-secondary"></i>;
      case "quote":
        return <i className="ri-double-quotes-l text-accent"></i>;
      case "spotify":
        return <i className="ri-spotify-fill text-primary"></i>;
      case "logo":
        return <i className="ri-image-line text-secondary"></i>;
      default:
        return <i className="ri-question-mark text-secondary"></i>;
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 border border-secondary/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg">Layers</h2>
        <button 
          className="text-primary hover:text-primary/80 transition-colors"
          onClick={() => setAddingLayer(true)}
        >
          <i className="ri-add-line text-xl"></i>
        </button>
      </div>
      
      {addingLayer && (
        <div className="mb-4 p-3 bg-background rounded border border-secondary/30">
          <h3 className="text-sm font-medium mb-2">Add New Layer</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Name</label>
              <input 
                type="text" 
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                className="w-full bg-card border border-secondary/30 rounded px-2 py-1 text-sm"
                placeholder="Layer name"
              />
            </div>
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Type</label>
              <select 
                value={newLayerType}
                onChange={(e) => setNewLayerType(e.target.value)}
                className="w-full bg-card border border-secondary/30 rounded px-2 py-1 text-sm"
              >
                <option value="background">Background Video</option>
                <option value="quote">Quote Text</option>
                <option value="spotify">Spotify Player</option>
                <option value="logo">Logo/Image</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setAddingLayer(false)}
                className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddLayer}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/80 rounded"
              >
                Add Layer
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {layers.length === 0 ? (
          <div className="text-center py-6 text-foreground/50">
            <i className="ri-layers-line text-2xl mb-2"></i>
            <p className="text-sm">No layers yet. Add your first layer to begin.</p>
          </div>
        ) : (
          layers.map((layer) => (
            <div 
              key={layer.id} 
              className={`layer-card bg-background rounded border ${layer.type === 'spotify' ? 'border-primary/30' : 'border-secondary/30'} p-3 transition-all cursor-pointer hover:transform hover:-translate-y-1`}
              onClick={() => handleSelectLayer(layer)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <DragHandle className={layer.type === 'spotify' ? 'text-primary/70' : 'text-secondary/70'} />
                  <span className="font-medium">{layer.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    className="text-foreground/70 hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVisibility(layer.id, layer.visible);
                    }}
                  >
                    <i className={layer.visible ? "ri-eye-line" : "ri-eye-off-line"}></i>
                  </button>
                  <button 
                    className="text-foreground/70 hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(layer.id);
                    }}
                    title="Delete layer"
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id={`toggle-${layer.id}`} 
                      checked={layer.visible} 
                      onChange={() => handleToggleVisibility(layer.id, layer.visible)}
                      className="absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                      style={{
                        right: layer.visible ? '0' : 'auto',
                        borderColor: layer.visible ? 'hsl(var(--primary))' : 'transparent'
                      }}
                    />
                    <label 
                      htmlFor={`toggle-${layer.id}`} 
                      className="block overflow-hidden h-5 rounded-full cursor-pointer"
                      style={{
                        backgroundColor: layer.visible ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                      }}
                    ></label>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-16 w-28 bg-secondary/20 rounded flex items-center justify-center overflow-hidden">
                  {renderLayerTypeIcon(layer.type)}
                  <div className="text-xs ml-1">
                    {layer.type === "background" && "Background"}
                    {layer.type === "quote" && "Quotes"}
                    {layer.type === "spotify" && "Spotify"}
                    {layer.type === "logo" && "Logo/Image"}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-foreground/60 mb-1">{layer.type}.layer</p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 bg-background rounded text-xs ${
                      layer.type === 'spotify' ? 'text-primary' : 
                      layer.type === 'quote' ? 'text-accent' : 'text-secondary'
                    }`}>
                      {layer.type.charAt(0).toUpperCase() + layer.type.slice(1)}
                    </span>
                    <span className="text-xs text-foreground/60">z-index: {layer.zIndex}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
