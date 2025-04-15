import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLayoutContext } from "@/context/LayoutContext";
import { Layout } from "@/lib/types";

export function SavedLayouts() {
  const [addingLayout, setAddingLayout] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const { toast } = useToast();
  const { layers, setLayers } = useLayoutContext();

  const { data: layouts = [], isLoading } = useQuery<Layout[]>({
    queryKey: ['/api/layouts'],
  });

  const deleteLayoutMutation = useMutation({
    mutationFn: async (layoutId: number) => {
      await apiRequest("DELETE", `/api/layouts/${layoutId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      toast({
        title: "Success",
        description: "Layout deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete layout",
        variant: "destructive",
      });
    },
  });

  const handleAddLayout = async () => {
    if (!newLayoutName.trim()) {
      toast({
        title: "Error",
        description: "Layout name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const layoutData = {
        name: newLayoutName,
        preview: "/placeholder-preview.jpg", // This would be replaced with an actual preview
        layers: layers.map(layer => ({
          id: layer.id,
          position: layer.position,
          visible: layer.visible,
          zIndex: layer.zIndex
        })),
        createdAt: new Date().toISOString()
      };

      await apiRequest("POST", "/api/layouts", layoutData);
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      
      setAddingLayout(false);
      setNewLayoutName("");
      
      toast({
        title: "Success",
        description: "Layout saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save layout",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLayout = (layoutId: number) => {
    if (confirm("Are you sure you want to delete this layout?")) {
      deleteLayoutMutation.mutate(layoutId);
    }
  };

  const handleLoadLayout = (layout: Layout) => {
    // This would need to update all the layers based on the saved layout
    toast({
      title: "Loading layout",
      description: `Layout "${layout.name}" is being loaded`,
    });
    
    // Example of how this might work - would need to be adapted based on how layout data is stored
    if (layout.layers) {
      const updatedLayers = layers.map(layer => {
        const savedLayer = layout.layers.find((l: any) => l.id === layer.id);
        if (savedLayer) {
          return {
            ...layer,
            position: savedLayer.position,
            visible: savedLayer.visible,
            zIndex: savedLayer.zIndex
          };
        }
        return layer;
      });
      
      setLayers(updatedLayers);
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 border border-secondary/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg">Saved Layouts</h2>
        <button
          className="text-accent hover:text-accent/80 transition-colors"
          onClick={() => setAddingLayout(true)}
        >
          <i className="ri-add-circle-line text-xl"></i>
        </button>
      </div>

      {addingLayout && (
        <div className="mb-4 p-3 bg-background rounded border border-secondary/30">
          <h3 className="text-sm font-medium mb-2">Save Current Layout</h3>
          <input
            type="text"
            value={newLayoutName}
            onChange={(e) => setNewLayoutName(e.target.value)}
            className="w-full bg-card border border-secondary/30 rounded px-2 py-1 text-sm mb-2"
            placeholder="Layout name"
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setAddingLayout(false)}
              className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleAddLayout}
              className="px-3 py-1 text-sm bg-accent text-accent-foreground hover:bg-accent/80 rounded"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : layouts.length === 0 ? (
          <div className="text-center py-6 text-foreground/50">
            <i className="ri-layout-line text-2xl mb-2"></i>
            <p className="text-sm">No saved layouts yet.</p>
            <p className="text-xs mt-1">Create your first layout to begin.</p>
          </div>
        ) : (
          layouts.map((layout) => (
            <div key={layout.id} className="bg-background rounded-md p-2 border border-secondary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{layout.name}</span>
                <div className="flex space-x-1">
                  <button
                    className="text-foreground/70 hover:text-foreground"
                    onClick={() => {/* Edit layout name */}}
                  >
                    <i className="ri-pencil-line"></i>
                  </button>
                  <button
                    className="text-foreground/70 hover:text-destructive"
                    onClick={() => handleDeleteLayout(layout.id)}
                    disabled={deleteLayoutMutation.isPending}
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
              <div className="h-20 w-full rounded bg-card/70 mb-2 overflow-hidden flex items-center justify-center">
                <i className="ri-layout-4-line text-2xl text-secondary/70"></i>
              </div>
              <button
                className="w-full bg-primary/20 text-primary hover:bg-primary/30 py-1 rounded text-sm transition-colors"
                onClick={() => handleLoadLayout(layout)}
              >
                Load
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
