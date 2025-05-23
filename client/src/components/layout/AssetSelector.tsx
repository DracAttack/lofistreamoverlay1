import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@/lib/types";

interface AssetSelectorProps {
  selectedAsset: string;
  onAssetSelect: (assetPath: string) => void;
}

export function AssetSelector({ selectedAsset, onAssetSelect }: AssetSelectorProps) {
  const [filter, setFilter] = useState<string>("all");
  const isFirstRender = useRef(true);
  const [selectedAssetInternal, setSelectedAssetInternal] = useState<string>(selectedAsset);
  
  // Fetch all assets
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    refetchInterval: 5000 // Ensure we regularly refresh the asset list
  });
  
  // Keep internal state in sync with props
  useEffect(() => {
    console.log("AssetSelector - selectedAsset prop changed:", selectedAsset);
    setSelectedAssetInternal(selectedAsset);
  }, [selectedAsset]);
  
  // Update when internal selection changes
  const handleAssetSelect = (assetPath: string) => {
    console.log("AssetSelector - handleAssetSelect:", assetPath);
    setSelectedAssetInternal(assetPath);
    onAssetSelect(assetPath);
  };
  
  // Add debug logging and handle asset selection logic
  useEffect(() => {
    console.log("AssetSelector - Available assets:", assets.length, assets.map(a => a.path));
    console.log("AssetSelector - Current selection:", selectedAssetInternal);
    
    // Only auto-select the first asset if there's no selection and assets exist
    if (isFirstRender.current && assets.length > 0 && !selectedAssetInternal) {
      console.log("AssetSelector - Auto-selecting first asset:", assets[0].path);
      handleAssetSelect(assets[0].path);
      isFirstRender.current = false;
    }
  }, [assets, selectedAssetInternal]);
  
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
                  selectedAssetInternal === asset.path ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
                onClick={() => {
                  console.log("AssetSelector - Selecting asset:", asset.path);
                  handleAssetSelect(asset.path);
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