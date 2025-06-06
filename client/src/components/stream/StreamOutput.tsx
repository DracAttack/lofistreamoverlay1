import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layer, Quote, SpotifyNowPlaying } from "@/lib/types";
import { QuoteOverlay } from "./QuoteOverlay";
import { SpotifyWidget } from "./SpotifyWidget";
import { VideoOverlay } from "./VideoOverlay";
import { TimerOverlay } from "./TimerOverlay";
import { PersistentVideoPlayer } from "./PersistentVideoPlayer";
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
  const [localLayers, setLocalLayers] = useState<Layer[]>([]);
  
  // CRITICAL FIX: Get layers directly from context
  // This ensures both Preview and Stream views share the exact same source data
  const { layers } = useLayoutContext();
  
  // Force a re-render with layers from context when they change
  useEffect(() => {
    if (layers && Array.isArray(layers) && layers.length > 0) {
      console.log("StreamOutput - Setting layers from context:", layers.length);
      setLocalLayers(layers);
    } else {
      console.error("StreamOutput - No layers received from context!");
    }
  }, [layers]);
  
  // Debug logs to check if we're actually receiving data
  console.log('StreamOutput component - total layers received:', layers?.length || 0);
  console.log("All layers:", layers);
  console.log('StreamOutput component - layer summaries:', 
    (layers || []).map(l => ({ id: l.id, name: l.name, visible: l.visible, type: l.type })));

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

  // CRITICAL FIX: Force layers to be visible in Stream Output
  // Try BOTH localLayers AND direct context layers to see which one works
  const effectiveLayers = localLayers.length > 0 ? localLayers : layers;
  
  if (!effectiveLayers || effectiveLayers.length === 0) {
    console.error("StreamOutput - NO LAYERS AVAILABLE! This is the critical issue.");
  } else {
    console.log("StreamOutput - All layers:", effectiveLayers.length, 
      effectiveLayers.map(l => ({ id: l.id, name: l.name })));
  }
  
  // Create a hard-coded test layer if we have no layers
  let allLayers: Layer[] = [];
  
  if (Array.isArray(effectiveLayers) && effectiveLayers.length > 0) {
    // Use the real layers if available
    allLayers = [...effectiveLayers];
  } else {
    // Last resort - create a test layer for debugging
    console.error("EMERGENCY: Creating test layer since no layers are available");
    const emergencyLayer = {
      id: 999,
      name: "EMERGENCY TEST LAYER",
      type: "background",
      position: {
        x: 0,
        y: 0, 
        width: 400,
        height: 200,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 20,
        heightPercent: 20
      },
      style: {
        backgroundColor: "rgba(255, 0, 0, 0.7)",
        textColor: "white",
        borderRadius: "0"
      },
      content: {
        text: "EMERGENCY: No layers found in context!"
      },
      zIndex: 10,
      visible: true
    } as Layer;
    
    allLayers = [emergencyLayer];
  }
  
  // IMPORTANT: Override the visibility setting for Stream Output
  // We want ALL layers to show here regardless of their visibility setting
  const visibleLayers = allLayers
    .map(layer => ({ ...layer, visible: true })) // Force all layers to be visible
    .sort((a, b) => a.zIndex - b.zIndex);
    
  console.log("StreamOutput - Layers being rendered:", visibleLayers.length);
  
  // In case of emergency, hard-code a test layer if nothing is available
  if (visibleLayers.length === 0) {
    console.error("StreamOutput - No layers available from context! Using emergency test layer:");
  }
    
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

  // Fixed dimensions scaling for OBS browser source
  useEffect(() => {
    // Get aspect ratio from props or document data attribute
    const docAspect = document.documentElement.getAttribute('data-aspect-ratio');
    const aspectToUse = aspectRatio || docAspect || '16:9';
    
    // For OBS Browser Source, we need to ensure the canvas is always 1920x1080
    // and centered in the view without any scaling or padding
    const applyOBSOptimizedLayout = () => {
      if (!containerRef.current) return;
      
      // Fixed dimensions for 1080p (standard broadcast resolution)
      containerRef.current.style.width = `${BASE_WIDTH}px`;  // Always 1920px
      containerRef.current.style.height = `${BASE_HEIGHT}px`; // Always 1080px
      
      // Ensure no transforms are applied that could affect rendering
      containerRef.current.style.transform = 'none';
      containerRef.current.style.transformOrigin = 'center';
      
      console.log('OBS Stream Output: Fixed 1920x1080 canvas');
    };
    
    // Apply OBS optimized layout immediately
    applyOBSOptimizedLayout();
  }, [aspectRatio]);

  return (
    <div 
      ref={containerRef}
      className="stream-canvas relative overflow-hidden bg-black"
      style={{ 
        margin: '0 auto',
        padding: '0',
        position: 'relative',
        width: '1920px',  // Fixed width for OBS
        height: '1080px', // Fixed height for OBS
        overflow: 'hidden',
        backgroundColor: 'black'
      }}
    >
      {/* CRITICAL DEBUGGING: Force render a test layer if no layers exist */}
      {(!visibleLayers || visibleLayers.length === 0) && (
        <div 
          className="absolute bg-red-600 text-white"
          style={{
            left: '50px',
            top: '50px',
            width: '300px',
            height: '100px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            padding: '10px',
            textAlign: 'center'
          }}
        >
          ⚠️ CRITICAL: No layers received from context! Check that LayoutContext is working properly.
        </div>
      )}
      {/* Render all layers in z-index order */}
      {visibleLayers.map(layer => {
        // IMPORTANT: For Stream Output, we ALWAYS use percentage values
        // converted to absolute pixels at 1920x1080 resolution
        
        // Check if this layer should be in fullscreen mode - multiple ways to check
        // IMPORTANT: This is Layer 1, the background video, and needs special handling
        const isBackgroundLayer = layer.id === 1;
        const hasFullscreenFlag = layer.content?.isFullscreen === true;
        const isFullscreen = isBackgroundLayer || hasFullscreenFlag;
        
        // DEBUG: Always print Layer 1 details
        if (isBackgroundLayer) {
          console.log(`BACKGROUND LAYER ${layer.id} settings:`, { 
            isBackgroundLayer,
            hasFullscreenFlag,
            isFullscreen,
            content: layer.content,
            source: layer.content?.source
          });
          
          // More detailed debugging for Layer 1
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
                  isBackgroundLayer ? (
                    // For background layer (Layer 1), use the persistent player
                    // This will never reload or reset on browser refresh
                    <PersistentVideoPlayer
                      key={`persistent-${layer.id}`} // Stable key for React reconciliation
                      source={layer.content.source}
                      style={{
                        backgroundColor: /\.webm$/i.test(layer.content.source) ? 'transparent' : layer.style.backgroundColor,
                        textColor: layer.style.textColor,
                        borderRadius: layer.style.borderRadius,
                        backdropBlur: layer.style.backdropBlur,
                        opacity: layer.style.opacity !== undefined ? 
                          parseFloat(layer.style.opacity as unknown as string) : 1
                      }}
                      playbackMode="background"
                    /> 
                  ) : (
                    // For non-background layers, keep the scheduling capability
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
                      loop={layer.content.scheduleEnabled 
                            ? (layer.content.scheduleLoop === true) 
                            : true} // If scheduling enabled, respect scheduleLoop; otherwise default to true
                      autoplay={true}
                      muted={true}
                      schedule={{
                        enabled: Boolean(layer.content.scheduleEnabled),
                        interval: parseInt(String(layer.content.scheduleInterval || "600"), 10),
                        duration: parseInt(String(layer.content.scheduleDuration || "5"), 10),
                        autoHide: layer.content.scheduleEnabled ? 
                            (layer.content.scheduleAutoHide !== false) : 
                            true
                      }}
                    />
                  )
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
