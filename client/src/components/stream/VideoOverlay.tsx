import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VideoOverlayProps {
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    backdropBlur?: string;
    opacity?: number;
  };
  source?: string;
  loop?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  preview?: boolean;
}

export function VideoOverlay({ 
  style = {}, 
  source,
  loop = true,
  autoplay = true,
  muted = true,
  preview = false
}: VideoOverlayProps) {
  const [videoError, setVideoError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [source]);

  if (!source) {
    return null;
  }

  // Handle video loading errors
  const handleVideoError = () => {
    console.error("Error loading video:", source);
    setVideoError(true);
  };

  const handleVideoLoaded = () => {
    setIsLoaded(true);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        preview ? "rounded-md w-full h-full" : "w-full h-full"
      )}
      style={{
        backgroundColor: style.backgroundColor || 'transparent',
        borderRadius: style.borderRadius || '0px',
        backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur})` : 'none',
      }}
    >
      {videoError ? (
        <div className="flex items-center justify-center w-full h-full p-4 text-center bg-background/20 rounded">
          <div className="text-sm text-destructive">
            <p>Failed to load video</p>
            <p className="text-xs break-all mt-2">{source}</p>
          </div>
        </div>
      ) : !isLoaded ? (
        <div className="flex items-center justify-center w-full h-full p-4">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : null}
      
      <video
        src={source}
        className={cn(
          "w-full h-full object-cover",
          videoError ? "hidden" : isLoaded ? "visible" : "invisible",
          !preview && "absolute inset-0"
        )}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        playsInline
        onError={handleVideoError}
        onLoadedData={handleVideoLoaded}
        style={{
          opacity: style.opacity !== undefined ? style.opacity : 1
        }}
      />
    </div>
  );
}