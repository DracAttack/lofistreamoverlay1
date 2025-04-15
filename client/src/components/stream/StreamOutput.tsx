import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layer, Quote, SpotifyNowPlaying } from "@/lib/types";
import { QuoteOverlay } from "./QuoteOverlay";
import { SpotifyWidget } from "./SpotifyWidget";
import { VideoOverlay } from "./VideoOverlay";

export function StreamOutput() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [bgVideo, setBgVideo] = useState("");

  // Fetch layers
  const { data: layers = [] } = useQuery<Layer[]>({
    queryKey: ['/api/layers'],
    refetchInterval: 5000 // Check for layer updates every 5 seconds
  });

  // Fetch quotes
  const { data: quotesData = [] } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
  });
  
  // Update quotes when data changes
  useEffect(() => {
    if (quotesData.length > 0) {
      setQuotes(quotesData);
    }
  }, [quotesData]);

  // Get currently playing track from Spotify
  const { data: spotifyData } = useQuery<SpotifyNowPlaying>({
    queryKey: ['/api/spotify/currently-playing'],
    refetchInterval: 10000, // Check every 10 seconds
  });

  // Find the visible layers sorted by z-index
  // All layers are treated generically now, just sort by z-index
  const visibleLayers = layers
    .filter(layer => layer.visible)
    .sort((a, b) => a.zIndex - b.zIndex);
    
  // Get a layer with Spotify connection
  const spotifyLayer = visibleLayers.find(
    layer => layer.content?.spotifyEnabled === true
  );

  // Rotate quotes every 30 seconds
  useEffect(() => {
    if (quotes.length > 1) {
      const quoteInterval = setInterval(() => {
        setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
      }, 30 * 1000); // Fixed 30 second rotation
      
      return () => clearInterval(quoteInterval);
    }
  }, [quotes]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Render all layers in z-index order */}
      {visibleLayers.map(layer => {
        // Set up position styles
        const position = {
          left: `${layer.position.x}px`,
          top: `${layer.position.y}px`,
          width: layer.position.width === 'auto' ? 'auto' : `${layer.position.width}px`,
          height: layer.position.height === 'auto' ? 'auto' : `${layer.position.height}px`,
          zIndex: layer.zIndex
        };
        
        // Special case for first layer - treat as background
        const isBackground = layer === visibleLayers[0];
        
        return (
          <div 
            key={layer.id}
            className={isBackground ? "absolute inset-0" : "absolute"}
            style={isBackground ? { zIndex: layer.zIndex } : position}
          >
            {/* Handle different types of content based on source path */}
            {layer.content?.source ? (
              <>
                {/\.(mp4|webm|ogg|mov)$/i.test(layer.content.source) ? (
                  // Video content
                  <VideoOverlay
                    style={{
                      backgroundColor: layer.style.backgroundColor,
                      textColor: layer.style.textColor,
                      borderRadius: layer.style.borderRadius,
                      backdropBlur: layer.style.backdropBlur,
                      opacity: layer.style.opacity !== undefined ? 
                        parseFloat(layer.style.opacity as unknown as string) : 1
                    }}
                    source={layer.content.source}
                    loop={true}
                    autoplay={true}
                    muted={true}
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
                      backdropFilter: layer.style.backdropBlur ? 
                        `blur(${layer.style.backdropBlur})` : 'none',
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
                      backdropFilter: layer.style.backdropBlur ? 
                        `blur(${layer.style.backdropBlur})` : 'none',
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
              // Empty regular layer
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{
                  backgroundColor: layer.style.backgroundColor || 'rgba(0,0,0,0.5)',
                  borderRadius: layer.style.borderRadius || '0',
                  backdropFilter: layer.style.backdropBlur ? 
                    `blur(${layer.style.backdropBlur})` : 'none',
                }}
              >
                <p style={{ color: layer.style.textColor || '#fff' }}>
                  {layer.name}
                </p>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Spotify Widget - special case */}
      {spotifyLayer && spotifyData && (
        <div 
          className="absolute"
          style={{
            left: `${spotifyLayer.position.x}px`,
            top: `${spotifyLayer.position.y}px`,
            width: spotifyLayer.position.width === 'auto' ? 'auto' : `${spotifyLayer.position.width}px`,
            height: spotifyLayer.position.height === 'auto' ? 'auto' : `${spotifyLayer.position.height}px`,
            zIndex: spotifyLayer.zIndex,
          }}
        >
          <SpotifyWidget 
            style={spotifyLayer.style}
            track={spotifyData.track}
            isPlaying={spotifyData.isPlaying}
          />
        </div>
      )}
    </div>
  );
}
