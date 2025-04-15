import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLayoutContext } from '@/context/LayoutContext';
import { apiRequest } from '@/lib/queryClient';
import { Layer } from '@/lib/types';
import { queryClient } from '@/lib/queryClient';

/**
 * Component to create a test layer for debugging position syncing
 */
export function TestLayerCreator() {
  const { toast } = useToast();
  const { layers, setLayers } = useLayoutContext();

  const createTestLayer = async () => {
    // Get maximum zIndex to put this layer on top
    const maxZIndex = layers.length > 0 
      ? Math.max(...layers.map(l => l.zIndex))
      : 0;
    
    try {
      // Create a new test layer with a colored rectangle
      const response = await apiRequest('POST', '/api/layers', {
        name: `Test Layer ${Date.now()}`,
        type: 'logo',
        position: {
          x: 50, 
          y: 50,
          width: 200,
          height: 200
        },
        style: {
          backgroundColor: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`,
          textColor: '#ffffff',
          borderRadius: '8px',
          backdropBlur: '0px'
        },
        content: {},
        zIndex: maxZIndex + 1,
        visible: true
      });

      // Parse the response to get the actual layer data
      const newLayer = await response.json();

      toast({
        title: "Test layer created",
        description: "Use this layer to test drag & resize synchronization"
      });
      
      // Invalidate queries to refresh the layers
      queryClient.invalidateQueries({ queryKey: ['/api/layers'] });
      
      // Update current layers with the new layer from server
      setLayers(prevLayers => [...prevLayers, newLayer]);
    } catch (error) {
      console.error("Failed to create test layer:", error);
      toast({
        title: "Error",
        description: "Failed to create test layer",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      className="ml-2 bg-amber-600 hover:bg-amber-700" 
      onClick={createTestLayer}
    >
      Create Test Layer
    </Button>
  );
}