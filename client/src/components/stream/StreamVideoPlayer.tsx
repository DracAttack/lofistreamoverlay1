import React, { useRef, useEffect, memo } from "react";

interface StreamVideoPlayerProps {
  source: string;
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    backdropBlur?: string;
    opacity?: number;
  };
  isBackground?: boolean;
}

/**
 * Optimized video player for stream output
 * Designed for maximum stability in 24/7 OBS browser source scenarios
 * 
 * Features:
 * - Prevents reset on React re-renders
 * - Avoids unnecessary DOM manipulation
 * - Reliable autoplay with loop
 * - Uses strict video attributes to ensure browser compatibility
 */
export const StreamVideoPlayer = memo(({ 
  source, 
  style,
  isBackground = false
}: StreamVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isTransparentWebm = /\.webm$/i.test(source);
  
  // Setup video playback - only runs once when component mounts
  useEffect(() => {
    if (!videoRef.current || !source) return;
    
    // Only attempt to play - NEVER load() in production
    // This avoids resetting the video on React refresh
    const playVideo = () => {
      if (videoRef.current) {
        // Simple play() with error handling
        videoRef.current.play().catch(error => {
          console.warn("Stream video autoplay failed:", error);
          // No need to retry - browser policies are strict
        });
      }
    };
    
    // Play immediately and set up event handlers
    playVideo();
    
    // Only add these event listeners once
    const video = videoRef.current;
    
    // Handle error events for better debugging
    const handleError = (e: Event) => {
      console.error("Stream video error:", e);
    };
    
    // Log if the video ends unexpectedly despite loop=true
    const handleEnded = () => {
      console.log("Stream video ended despite loop - restarting");
      video.play().catch(() => {});
    };
    
    // The loadeddata event is safer than loadedmetadata
    const handleLoaded = () => {
      console.log(`Stream video loaded: ${source.substring(0, 30)}...`);
      video.play().catch(() => {});
    };
    
    // Add event listeners for reliable playback
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("loadeddata", handleLoaded);
    
    // Clean up event listeners on unmount
    return () => {
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadeddata", handleLoaded);
    };
  }, [source]); // Only re-run if source changes
  
  return (
    <div 
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: isTransparentWebm ? 'transparent' : (style?.backgroundColor || 'transparent'),
        borderRadius: style?.borderRadius || '0',
        opacity: style?.opacity !== undefined ? style.opacity : 1,
        backdropFilter: style?.backdropBlur ? `blur(${style.backdropBlur})` : undefined,
      }}
    >
      {source ? (
        <video
          ref={videoRef}
          src={source}
          className="w-full h-full"
          style={{
            backgroundColor: 'transparent',
            objectFit: isBackground ? 'cover' : 'contain',
            width: '100%',
            height: '100%'
          }}
          // Stream-optimized video attributes
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-4">
          <p style={{ color: style?.textColor || '#ffffff' }}>
            No video source selected
          </p>
        </div>
      )}
    </div>
  );
});

// Displayname for debugging
StreamVideoPlayer.displayName = 'StreamVideoPlayer';