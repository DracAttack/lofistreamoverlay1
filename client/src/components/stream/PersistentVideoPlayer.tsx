import React, { useRef, useEffect, useState, memo } from "react";

interface PersistentVideoPlayerProps {
  source: string;
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    backdropBlur?: string;
    opacity?: number;
  };
  playbackMode?: 'background' | 'regular';
}

/**
 * Persistent Video Player - Optimized for 24/7 streaming
 * Features:
 * - Remembers playback position between refreshes with localStorage
 * - Never resets video on React re-render
 * - Uses a strict minimal DOM approach to prevent video flicker
 * - Follows all browser autoplay best practices
 */
export const PersistentVideoPlayer = memo(({
  source,
  style = {
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    borderRadius: '0',
    opacity: 1
  },
  playbackMode = 'regular'
}: PersistentVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const initialRender = useRef(true);
  const isBackgroundVideo = playbackMode === 'background';
  const isTransparentWebm = /\.webm$/i.test(source || '');
  
  // Create a unique ID based on source URL for localStorage 
  const videoId = `video-${source.split('/').pop()?.replace(/[^a-z0-9]/gi, '')}`;
  
  // Detect if we were playing this video before
  useEffect(() => {
    if (!videoRef.current || !source) return;
    
    console.log(`Persistent player: Initializing ${isBackgroundVideo ? 'BACKGROUND' : 'regular'} video`);
    
    // Never manually load() the video, let the browser handle it
    // We're relying on the video tag's native autoplay, loop attributes
    
    // For background videos, start from the beginning always
    if (isBackgroundVideo) {
      console.log("Background video: Starting from beginning (always looping)");
    } 
    // For regular videos, try to resume from last position if possible
    else {
      try {
        // Attempt to restore previous position from localStorage
        const savedTime = localStorage.getItem(`${videoId}-time`);
        if (savedTime && videoRef.current) {
          const time = parseFloat(savedTime);
          if (!isNaN(time) && time > 0) {
            console.log(`Restoring video playback to ${time.toFixed(2)} seconds`);
            // Set the current time directly - no need to load()
            videoRef.current.currentTime = time;
          }
        }
      } catch (err) {
        console.warn("Could not restore video position:", err);
      }
    }

    // The video should auto-play due to the attributes
    // We don't need to explicitly call play()
  }, [source, videoId, isBackgroundVideo]);
  
  // Save position periodically for non-background videos
  useEffect(() => {
    if (isBackgroundVideo || !source) return; // Don't track background videos
    
    // Save current position every 2 seconds
    const saveInterval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        try {
          localStorage.setItem(`${videoId}-time`, videoRef.current.currentTime.toString());
        } catch (err) {
          // Ignore storage errors
        }
      }
    }, 2000);
    
    return () => clearInterval(saveInterval);
  }, [videoId, source, isBackgroundVideo]);

  // Special handler for video seeking
  const handleTimeUpdate = () => {
    if (!videoRef.current || isBackgroundVideo) return;
    
    // Save position immediately on seek
    try {
      localStorage.setItem(`${videoId}-time`, videoRef.current.currentTime.toString());
    } catch (err) {
      // Ignore storage errors
    }
  };
  
  return (
    <div 
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: isTransparentWebm ? 'transparent' : (style.backgroundColor || 'transparent'),
        borderRadius: style.borderRadius || '0',
        opacity: style.opacity !== undefined ? style.opacity : 1,
        backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur})` : undefined,
      }}
    >
      {source && (
        <video
          ref={videoRef}
          src={source}
          className="w-full h-full"
          style={{
            backgroundColor: 'transparent',
            objectFit: isBackgroundVideo ? 'cover' : 'contain',
            width: '100%',
            height: '100%'
          }}
          // Critical stream-optimized attributes
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
          onTimeUpdate={handleTimeUpdate}
        />
      )}
    </div>
  );
});

// Add display name for debugging
PersistentVideoPlayer.displayName = 'PersistentVideoPlayer';