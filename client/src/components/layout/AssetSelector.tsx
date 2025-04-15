import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@/lib/types";

interface AssetSelectorProps {
  selectedAsset: string;
  onAssetSelect: (assetPath: string) => void;
}

export function AssetSelector({ selectedAsset, onAssetSelect }: AssetSelectorProps) {
  const [filter, setFilter] = useState<string>("all");
  const isInitialMount = useRef(true);
  
  // Fetch all assets
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });
  
  // Add debug logging
  useEffect(() => {
    console.log("AssetSelector - Current assets:", assets);
    console.log("AssetSelector - Selected asset:", selectedAsset);
    
    // Auto-select the first asset if none is selected and assets exist
    if (isInitialMount.current && assets.length > 0 && !selectedAsset) {
      console.log("AssetSelector - Auto-selecting first asset:", assets[0].path);
      onAssetSelect(assets[0].path);
      isInitialMount.current = false;
    }
  }, [assets, selectedAsset, onAssetSelect]);
  
  // Filter assets by type
  const filteredAssets = filter === "all" 
    ? assets 
    : assets.filter(asset => asset.type === filter);
  
  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-md">
        <button
          className={`px-3 py-1.5 text-xs rounded ${
            filter === "all" ? "bg-background shadow-sm" : "hover:bg-background/50"
          }`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`px-3 py-1.5 text-xs rounded ${
            filter === "image" ? "bg-background shadow-sm" : "hover:bg-background/50"
          }`}
          onClick={() => setFilter("image")}
        >
          Images
        </button>
        <button
          className={`px-3 py-1.5 text-xs rounded ${
            filter === "video" ? "bg-background shadow-sm" : "hover:bg-background/50"
          }`}
          onClick={() => setFilter("video")}
        >
          Videos
        </button>
        <button
          className={`px-3 py-1.5 text-xs rounded ${
            filter === "audio" ? "bg-background shadow-sm" : "hover:bg-background/50"
          }`}
          onClick={() => setFilter("audio")}
        >
          Audio
        </button>
        <button
          className={`px-3 py-1.5 text-xs rounded ${
            filter === "text" ? "bg-background shadow-sm" : "hover:bg-background/50"
          }`}
          onClick={() => setFilter("text")}
        >
          Text
        </button>
      </div>
      
      {/* Asset grid */}
      <div className="bg-card border border-border rounded-md p-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No assets found</p>
            <p className="text-xs mt-1">Upload assets in the Asset Manager</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`relative aspect-square rounded-md overflow-hidden border transition-all cursor-pointer hover:opacity-90 hover:border-secondary ${
                  selectedAsset === asset.path ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
                onClick={() => {
                  console.log("AssetSelector - Selecting asset:", asset.path);
                  onAssetSelect(asset.path);
                }}
              >
                {asset.type === "image" && (
                  <img 
                    src={asset.path} 
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                )}
                {asset.type === "video" && (
                  <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                    <i className="ri-movie-line text-lg"></i>
                  </div>
                )}
                {asset.type === "audio" && (
                  <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                    <i className="ri-music-line text-lg"></i>
                  </div>
                )}
                {asset.type === "text" && (
                  <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                    <i className="ri-file-text-line text-lg"></i>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                  <p className="text-[10px] text-white truncate">{asset.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected asset display */}
      {selectedAsset && (
        <div className="p-2 bg-muted/50 border border-border rounded-md">
          <p className="text-xs mb-1 font-medium">Selected Asset:</p>
          <p className="text-xs truncate text-muted-foreground break-all">
            {selectedAsset.split('/').pop() || selectedAsset}
          </p>
        </div>
      )}
    </div>
  );
}