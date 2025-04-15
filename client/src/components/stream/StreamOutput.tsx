import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layer, Quote, SpotifyNowPlaying } from "@/lib/types";
import { QuoteOverlay } from "./QuoteOverlay";
import { SpotifyWidget } from "./SpotifyWidget";
import { VideoOverlay } from "./VideoOverlay";
import { TimerOverlay } from "./TimerOverlay";
import { useLayoutContext } from "@/context/LayoutContext";

interface StreamOutputProps {
  aspectRatio?: string;
}

// Base resolution constants for 1080p standard
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

export function StreamOutput({ aspectRatio }: StreamOutputProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [bgVideo, setBgVideo] = useState("");

  // Use the LayoutContext directly instead of API fetching
  // This ensures both Preview and Stream views share the exact same source data
  const { layers } = useLayoutContext();

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

  // Auto-scale the output to fit the container while maintaining 1920x1080 coordinates
  useEffect(() => {
    // Get aspect ratio from props or document data attribute
    const docAspect = document.documentElement.getAttribute('data-aspect-ratio');
    const aspectToUse = aspectRatio || docAspect || '16:9';
    
    // Function to calculate and apply the scaling factor
    const applyScaling = () => {
      if (!containerRef.current) return;
      
      const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
      
      // Calculate how much we need to scale down
      const scaleFactor = Math.min(1, parentWidth / BASE_WIDTH);
      
      // Apply the appropriate transform scale
      containerRef.current.style.transform = `scale(${scaleFactor})`;
      
      // Adjust the container height to account for the scaling
      containerRef.current.style.height = `${BASE_HEIGHT}px`;
      containerRef.current.style.width = `${BASE_WIDTH}px`;
      
      // Set the parent container's height to match the scaled height
      if (containerRef.current.parentElement) {
        containerRef.current.parentElement.style.height = `${BASE_HEIGHT * scaleFactor}px`;
        containerRef.current.parentElement.style.overflow = 'hidden';
      }
    };
    
    // Apply scaling immediately
    applyScaling();
    
    // Reapply scaling on window resize
    window.addEventListener('resize', applyScaling);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', applyScaling);
    };
  }, [aspectRatio]);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-background stream-output"
      style={{ 
        margin: '0 auto',
        position: 'relative',
        width: '1920px',
        height: '1080px',
        maxWidth: '100%',
        aspectRatio: aspectRatio === '4:3' ? '4/3' : aspectRatio === '1:1' ? '1/1' : '16/9',
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }}
    >
      {/* Render all layers in z-index order */}
      {visibleLayers.map(layer => {
        // Set up position styles using percentage values if available, fallback to pixels
        const position = {
          // If percentage values are available, use them for consistent cross-view positioning
          left: layer.position.xPercent ? `${layer.position.xPercent}%` : `${layer.position.x}px`,
          top: layer.position.yPercent ? `${layer.position.yPercent}%` : `${layer.position.y}px`,
          width: layer.position.width === 'auto' ? 'auto' : 
                (layer.position.widthPercent ? `${layer.position.widthPercent}%` : `${layer.position.width}px`),
          height: layer.position.height === 'auto' ? 'auto' : 
                 (layer.position.heightPercent ? `${layer.position.heightPercent}%` : `${layer.position.height}px`),
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
            left: spotifyLayer.position.xPercent ? `${spotifyLayer.position.xPercent}%` : `${spotifyLayer.position.x}px`,
            top: spotifyLayer.position.yPercent ? `${spotifyLayer.position.yPercent}%` : `${spotifyLayer.position.y}px`,
            width: spotifyLayer.position.width === 'auto' ? 'auto' : 
                  (spotifyLayer.position.widthPercent ? `${spotifyLayer.position.widthPercent}%` : `${spotifyLayer.position.width}px`),
            height: spotifyLayer.position.height === 'auto' ? 'auto' : 
                   (spotifyLayer.position.heightPercent ? `${spotifyLayer.position.heightPercent}%` : `${spotifyLayer.position.height}px`),
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
