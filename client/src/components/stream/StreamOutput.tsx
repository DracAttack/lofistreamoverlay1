import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layer, Quote, SpotifyNowPlaying } from "@/lib/types";
import { QuoteOverlay } from "./QuoteOverlay";
import { SpotifyWidget } from "./SpotifyWidget";
import { VideoOverlay } from "./VideoOverlay";
import { TimerOverlay } from "./TimerOverlay";

interface StreamOutputProps {
  aspectRatio?: string;
}

export function StreamOutput({ aspectRatio }: StreamOutputProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Watch for aspect ratio changes
  useEffect(() => {
    // Get aspect ratio from props or document data attribute
    const docAspect = document.documentElement.getAttribute('data-aspect-ratio');
    const aspectToUse = aspectRatio || docAspect || '16:9';
    
    // Apply the aspect ratio to the container
    if (containerRef.current) {
      containerRef.current.classList.remove(
        'aspect-video', 'aspect-[4/3]', 'aspect-square'
      );
      
      if (aspectToUse === '16:9') {
        containerRef.current.classList.add('aspect-video');
      } else if (aspectToUse === '4:3') {
        containerRef.current.classList.add('aspect-[4/3]');
      } else if (aspectToUse === '1:1') {
        containerRef.current.classList.add('aspect-square');
      }
    }
  }, [aspectRatio]);

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video w-full max-h-screen overflow-hidden bg-background"
      style={{ 
        margin: '0 auto',
        position: 'relative' 
      }}
    >
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
            {/* Handle different types of content based on content */}
            {layer.content.timerEnabled ? (
              // Timer overlay
              <TimerOverlay
                style={layer.style}
                timerConfig={{
                  duration: layer.content.timerDuration || 300,
                  direction: layer.content.timerDirection || 'down',
                  startTime: layer.content.timerStartTime,
                  format: layer.content.timerFormat || 'mm:ss'
                }}
                preview={false}
              />
            ) : layer.content?.source ? (
              <>
                {/\.(mp4|webm|ogg|mov)$/i.test(layer.content.source) ? (
                  // Video content with scheduling support
                  <VideoOverlay
                    key={`video-${layer.id}-${layer.content.source}`} // Unique key based on layer ID and source
                    style={{
                      backgroundColor: /\.webm$/i.test(layer.content.source) ? 'transparent' : layer.style.backgroundColor,
                      textColor: layer.style.textColor,
                      borderRadius: layer.style.borderRadius,
                      backdropBlur: layer.style.backdropBlur,
                      opacity: layer.style.opacity !== undefined ? 
                        parseFloat(layer.style.opacity as unknown as string) : 1
                    }}
                    source={layer.content.source}
                    loop={layer.content.scheduleEnabled ? 
                      (layer.content.scheduleLoop === true) : 
                      true} // If scheduling enabled, respect scheduleLoop; otherwise default to true
                    autoplay={true}
                    muted={true}
                    schedule={{
                      enabled: Boolean(layer.content.scheduleEnabled), // Ensure boolean type
                      interval: parseInt(String(layer.content.scheduleInterval || "600"), 10), // Force number type
                      duration: parseInt(String(layer.content.scheduleDuration || "5"), 10),   // Force number type
                      autoHide: layer.content.scheduleEnabled ? 
                        (layer.content.scheduleAutoHide !== false) : 
                        true // default to true
                    }}
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
