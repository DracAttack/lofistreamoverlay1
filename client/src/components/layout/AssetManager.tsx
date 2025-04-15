import { useState, useEffect } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Asset } from "@/lib/types";

export function AssetManager() {
  const [activeTab, setActiveTab] = useState<"video" | "audio" | "image" | "text">("video");
  const { toast } = useToast();

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      await apiRequest("DELETE", `/api/assets/${assetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    },
  });

  const handleAssetUploadComplete = (asset: Asset) => {
    queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
  };

  const handleDeleteAsset = (assetId: number) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteAssetMutation.mutate(assetId);
    }
  };

  const handlePreviewAsset = (asset: Asset) => {
    if (asset.type === "video" || asset.type === "audio") {
      window.open(asset.path, "_blank");
    } else if (asset.type === "image") {
      window.open(asset.path, "_blank");
    } else if (asset.type === "text") {
      fetch(asset.path)
        .then((response) => response.text())
        .then((text) => {
          const blob = new Blob([text], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to preview text file",
            variant: "destructive",
          });
        });
    }
  };

  const filteredAssets = assets.filter((asset) => asset.type === activeTab);

  const getFileIcon = (asset: Asset) => {
    switch (asset.type) {
      case "video":
        return "ri-movie-line";
      case "audio":
        return "ri-music-line";
      case "image":
        return "ri-image-line";
      case "text":
        return "ri-file-text-line";
      default:
        return "ri-file-line";
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 border border-secondary/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg">Assets</h2>
        <div className="flex space-x-2">
          <button className="text-accent hover:text-accent/80 transition-colors">
            <i className="ri-folder-line text-xl"></i>
          </button>
          <button className="text-primary hover:text-primary/80 transition-colors">
            <i className="ri-upload-2-line text-xl"></i>
          </button>
        </div>
      </div>
      
      {/* Asset Types Tabs */}
      <div className="flex border-b border-secondary/20 mb-4">
        <button 
          className={`px-3 py-2 text-sm ${activeTab === "video" ? "tab-active border-b-2 border-primary text-primary" : ""}`}
          onClick={() => setActiveTab("video")}
        >
          Video
        </button>
        <button 
          className={`px-3 py-2 text-sm ${activeTab === "audio" ? "tab-active border-b-2 border-primary text-primary" : ""}`}
          onClick={() => setActiveTab("audio")}
        >
          Audio
        </button>
        <button 
          className={`px-3 py-2 text-sm ${activeTab === "image" ? "tab-active border-b-2 border-primary text-primary" : ""}`}
          onClick={() => setActiveTab("image")}
        >
          Images
        </button>
        <button 
          className={`px-3 py-2 text-sm ${activeTab === "text" ? "tab-active border-b-2 border-primary text-primary" : ""}`}
          onClick={() => setActiveTab("text")}
        >
          Text
        </button>
      </div>
      
      {/* File Upload Area */}
      <FileUpload
        className="mb-4"
        accept={
          activeTab === "video" ? "video/*" :
          activeTab === "audio" ? "audio/*" :
          activeTab === "image" ? "image/*" :
          "text/*,.json"
        }
        maxSize={activeTab === "text" ? 1024 * 1024 : 50 * 1024 * 1024} // 1MB for text, 50MB for others
        onUploadComplete={handleAssetUploadComplete}
        fileType={activeTab}
      />
      
      {/* Asset List */}
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-4 text-foreground/50">
            <p className="text-sm">No {activeTab} assets found</p>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between p-2 hover:bg-background/50 rounded">
              <div className="flex items-center space-x-2 overflow-hidden">
                <i className={`${getFileIcon(asset)} ${
                  asset.type === "video" ? "text-secondary" :
                  asset.type === "audio" ? "text-primary" :
                  asset.type === "image" ? "text-accent" :
                  "text-foreground/70"
                }`}></i>
                <span className="text-sm truncate">{asset.name}</span>
              </div>
              <div className="flex space-x-1">
                <button 
                  className="text-xs text-foreground/70 hover:text-foreground"
                  onClick={() => handlePreviewAsset(asset)}
                >
                  <i className="ri-eye-line"></i>
                </button>
                <button 
                  className="text-xs text-foreground/70 hover:text-destructive"
                  onClick={() => handleDeleteAsset(asset.id)}
                  disabled={deleteAssetMutation.isPending}
                >
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
