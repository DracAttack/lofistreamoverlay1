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
    
    // Parse aspect ratio to get dimensions
    const getAspectDimensions = (aspect: string) => {
      if (aspect === '16:9') return { width: 16, height: 9 };
      if (aspect === '4:3') return { width: 4, height: 3 };
      if (aspect === '1:1') return { width: 1, height: 1 };
      
      // Parse custom ratio if provided in format "width:height"
      const parts = aspect.split(':');
      if (parts.length === 2) {
        const width = parseInt(parts[0], 10);
        const height = parseInt(parts[1], 10);
        if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
          return { width, height };
        }
      }
      
      // Default to 16:9 if invalid
      return { width: 16, height: 9 };
    };
    
    // Function to calculate and apply the scaling factor
    const applyScaling = () => {
      if (!containerRef.current) return;
      
      // Get container and parent dimensions
      const parentElement = containerRef.current.parentElement;
      if (!parentElement) return;
      
      const parentWidth = parentElement.clientWidth || window.innerWidth;
      const parentHeight = parentElement.clientHeight || window.innerHeight;
      
      // Get appropriate aspect ratio dimensions
      const aspectDimensions = getAspectDimensions(aspectToUse);
      const aspectRatio = aspectDimensions.width / aspectDimensions.height;
      
      // Calculate dimensions that fit within the parent while maintaining aspect ratio
      let targetWidth = BASE_WIDTH;
      let targetHeight = BASE_HEIGHT;
      
      // Adjust for different aspect ratios if needed
      if (aspectRatio !== 16/9) {
        // If not 16:9, adjust height but keep width as 1920px base
        targetHeight = targetWidth / aspectRatio;
      }
      
      // Calculate how much we need to scale
      const widthScale = parentWidth / targetWidth;
      const heightScale = parentHeight / targetHeight;
      
      // Use the smaller scale to ensure it fits entirely
      const scaleFactor = Math.min(widthScale, heightScale, 1); // Never scale up past 1
      
      // Set base size for the output container (always 1920x1080 equivalent)
      containerRef.current.style.width = `${targetWidth}px`;
      containerRef.current.style.height = `${targetHeight}px`;
      
      // Apply scale transform
      containerRef.current.style.transform = `scale(${scaleFactor})`;
      
      // Calculate final scaled dimensions
      const scaledWidth = targetWidth * scaleFactor;
      const scaledHeight = targetHeight * scaleFactor;
      
      // Apply to parent to ensure proper centering and spacing
      parentElement.style.width = `${scaledWidth}px`;
      parentElement.style.height = `${scaledHeight}px`;
      parentElement.style.margin = '0 auto';
      
      // Log scaling information for debugging
      console.log(`Stream scaling: ${scaleFactor.toFixed(3)} (${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)})`);
      
      // Log context about coordinate system for debugging
      if (visibleLayers.length > 0) {
        const sampleLayer = visibleLayers[0];
        console.log('Coordinate conversion example:', {
          layer: sampleLayer.name,
          sourcePercent: {
            x: sampleLayer.position.xPercent,
            y: sampleLayer.position.yPercent,
            width: sampleLayer.position.widthPercent,
            height: sampleLayer.position.heightPercent
          },
          convertedPixels: {
            x: sampleLayer.position.xPercent !== undefined ? (sampleLayer.position.xPercent / 100) * BASE_WIDTH : sampleLayer.position.x,
            y: sampleLayer.position.yPercent !== undefined ? (sampleLayer.position.yPercent / 100) * BASE_HEIGHT : sampleLayer.position.y,
            width: sampleLayer.position.widthPercent !== undefined ? (sampleLayer.position.widthPercent / 100) * BASE_WIDTH : sampleLayer.position.width,
            height: sampleLayer.position.heightPercent !== undefined ? (sampleLayer.position.heightPercent / 100) * BASE_HEIGHT : sampleLayer.position.height
          }
        });
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
        width: `${BASE_WIDTH}px`,
        height: `${BASE_HEIGHT}px`,
        maxWidth: '100%',
        aspectRatio: aspectRatio === '4:3' ? '4/3' : aspectRatio === '1:1' ? '1/1' : '16/9',
        transform: 'scale(1)',
        transformOrigin: 'center'
      }}
    >
      {/* Render all layers in z-index order */}
      {visibleLayers.map(layer => {
        // IMPORTANT: For Stream Output, we ALWAYS use percentage values
        // converted to absolute pixels at 1920x1080 resolution
        
        // Check if this layer should be in fullscreen mode
        const isFullscreen = layer.content?.isFullscreen === true;
        
        // For debugging - log layer details, especially for Layer 1
        if (layer.id === 1) {
          console.log('Layer 1 rendering details:', { 
            name: layer.name, 
            source: layer.content?.source,
            isFullscreen,
            position: layer.position,
            visible: layer.visible
          });
        }
        
        // Always use a consistent coordinate system based on percentages
        // This ensures alignment between preview panel and stream output
        const position = {
          // If fullscreen, position at 0,0 and fill entire canvas
          // Otherwise, calculate based on stored percentage coordinates
          left: isFullscreen ? '0px' : (
            layer.position.xPercent !== undefined 
              ? `${(layer.position.xPercent / 100) * BASE_WIDTH}px`  // Convert percentage to absolute pixels
              : `${layer.position.x}px`
          ),
          top: isFullscreen ? '0px' : (
            layer.position.yPercent !== undefined
              ? `${(layer.position.yPercent / 100) * BASE_HEIGHT}px` // Convert percentage to absolute pixels
              : `${layer.position.y}px`
          ),
          // Calculate dimensions - fullscreen covers entire canvas
          width: isFullscreen ? '100%' : (
            layer.position.width === 'auto' ? 'auto' : 
                (layer.position.widthPercent !== undefined 
                  ? `${(layer.position.widthPercent / 100) * BASE_WIDTH}px` // Convert percentage to absolute pixels
                  : `${layer.position.width}px`)
          ),
          height: isFullscreen ? '100%' : (
            layer.position.height === 'auto' ? 'auto' : 
                 (layer.position.heightPercent !== undefined
                  ? `${(layer.position.heightPercent / 100) * BASE_HEIGHT}px` // Convert percentage to absolute pixels
                  : `${layer.position.height}px`)
          ),
          zIndex: layer.zIndex
          // Position is set on the parent div
        };
        
        // All layers should be positioned normally (no special case for background)
        return (
          <div 
            key={layer.id}
            className="absolute"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              height: position.height,
              zIndex: position.zIndex
            }}
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
                        objectFit: 'contain'
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
            ) : layer.name ? (
              // Layer with name but no content source
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
            ) : (
              // Empty layer with no name or content
              <div 
                className="w-full h-full"
                style={{ backgroundColor: layer.style.backgroundColor || '#111' }}
              />
            )}
          </div>
        );
      })}
      
      {/* Spotify Widget - special case */}
      {spotifyLayer && spotifyData && (
        <div 
          className="absolute"
          style={{
            // Use same pixel conversion for Spotify widget (consistency with other layers)
            left: spotifyLayer.position.xPercent !== undefined 
              ? `${(spotifyLayer.position.xPercent / 100) * BASE_WIDTH}px`
              : `${spotifyLayer.position.x}px`,
            top: spotifyLayer.position.yPercent !== undefined
              ? `${(spotifyLayer.position.yPercent / 100) * BASE_HEIGHT}px`
              : `${spotifyLayer.position.y}px`,
            width: spotifyLayer.position.width === 'auto' ? 'auto' : 
                  (spotifyLayer.position.widthPercent !== undefined
                    ? `${(spotifyLayer.position.widthPercent / 100) * BASE_WIDTH}px`
                    : `${spotifyLayer.position.width}px`),
            height: spotifyLayer.position.height === 'auto' ? 'auto' : 
                   (spotifyLayer.position.heightPercent !== undefined
                    ? `${(spotifyLayer.position.heightPercent / 100) * BASE_HEIGHT}px`
                    : `${spotifyLayer.position.height}px`),
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
