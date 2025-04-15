import React, { useState, useEffect, useRef } from 'react';

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
  schedule?: {
    enabled?: boolean;
    interval?: number; // seconds between activations
    duration?: number; // seconds to show
    autoHide?: boolean;
  };
}

export function VideoOverlay({ 
  style = {
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    borderRadius: '0',
    backdropBlur: '',
    opacity: 1
  },
  source,
  loop = true,
  autoplay = true,
  muted = true,
  preview = false,
  schedule = {
    enabled: false,
    interval: 600, // default 10 minutes
    duration: 5, // default 5 seconds
    autoHide: true
  }
}: VideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(preview || !schedule.enabled || !schedule.autoHide);
  const [lastActivation, setLastActivation] = useState<number>(0);
  const [isTransparentWebm, setIsTransparentWebm] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [scheduleActive, setScheduleActive] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  
  // Update video reference and metadata when source changes
  useEffect(() => {
    if (source) {
      console.log("VideoOverlay: Source changed to:", source);
      
      // Reset visibility when source changes
      setIsVisible(autoplay || preview || !schedule.autoHide);
      
      // For WebM files, set a flag to render with transparency
      setIsTransparentWebm(/\.webm$/i.test(source));
      
      // Force the video to reload when source changes - this helps with scheduling
      // as it ensures the video is in a consistent state
      if (videoRef.current) {
        // Wait a tiny bit for the DOM to stabilize
        setTimeout(() => {
          if (videoRef.current) {
            console.log("VideoOverlay: Source changed - forcefully reloading video");
            videoRef.current.pause();
            videoRef.current.load();
            videoRef.current.currentTime = 0;
            
            // Force a layout reflow to ensure browser updates the video state
            void videoRef.current.offsetHeight;
            
            // Try to play the video if appropriate
            if (autoplay) {
              videoRef.current.play().catch(err => {
                console.error("Error playing video after source change:", err);
              });
            }
          }
        }, 50);
      }
    }
  }, [source, autoplay, preview, schedule.autoHide]);
  
  // Function to activate the overlay - defined outside useEffect to avoid recreation
  const activateOverlay = () => {
    console.log("Activating overlay for source:", source);
    setIsVisible(true);
    setScheduleActive(true);
    
    // Always forcefully restart the video when scheduled
    if (videoRef.current && source) {
      try {
        console.log("Forcefully restarting video from beginning");
        
        // First pause and reset position
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        
        // Force a layout reflow to ensure browser updates the video state
        void videoRef.current.offsetHeight;
        
        // Create a promise to detect when the video is ready
        const playPromise = videoRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log("Video playback started successfully");
          }).catch(err => {
            console.error("Error playing video:", err);
            // Try once more after a short delay with a different approach
            setTimeout(() => {
              if (videoRef.current) {
                // Try a different approach - remove and recreate source
                const originalSrc = videoRef.current.src;
                videoRef.current.src = "";
                
                // Force browser to recognize the change
                void videoRef.current.offsetHeight;
                
                // Set source back and play
                videoRef.current.src = originalSrc;
                videoRef.current.load();
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(retryErr => {
                  console.error("All retry attempts failed:", retryErr);
                });
              }
            }, 500);
          });
        }
      } catch (err) {
        console.error("Error in video activation:", err);
      }
    }
    
    // Schedule hide after duration if autoHide is enabled
    if (schedule.autoHide) {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Get the correct duration value with fallback
      const duration = typeof schedule.duration === 'number' ? schedule.duration : 5;
      
      console.log(`Scheduling hide after ${duration} seconds`);
      
      // Set new timeout to hide the overlay
      const newTimeoutId = setTimeout(() => {
        console.log("Hiding overlay after duration:", duration);
        setIsVisible(false);
        setScheduleActive(false);
      }, duration * 1000);
      
      setTimeoutId(newTimeoutId);
    }
    
    // Always update the last activation time
    setLastActivation(Date.now());
  };
  
  // Schedule activation logic - only runs when not in preview mode
  useEffect(() => {
    // Don't run scheduling in preview mode or when scheduling is disabled
    if (preview || !schedule.enabled) {
      console.log("VideoOverlay: Schedule disabled or in preview mode", { 
        preview, 
        scheduleEnabled: schedule.enabled,
        source,
        videoRef: videoRef.current ? 'exists' : 'missing',
        videoState: videoRef.current ? {
          paused: videoRef.current.paused,
          ended: videoRef.current.ended,
          currentTime: videoRef.current.currentTime,
          duration: videoRef.current.duration,
          readyState: videoRef.current.readyState,
          networkState: videoRef.current.networkState
        } : 'N/A'
      });
      
      // If in preview mode or disabled but the source exists, make sure it's visible
      if (source && (preview || !schedule.autoHide)) {
        setIsVisible(true);
      }
      
      return;
    }

    console.log("VideoOverlay: Schedule settings initialized:", {
      enabled: schedule.enabled,
      interval: schedule.interval,
      duration: schedule.duration,
      autoHide: schedule.autoHide,
      loop,
      source
    });
    
    // Immediately activate on first mount or when settings change
    console.log("VideoOverlay: Activating on schedule setup");
    activateOverlay();
    
    // Clear any existing interval
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    // Set up new interval for scheduled activation
    const newIntervalId = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = (now - lastActivation) / 1000;
      const intervalTime = schedule.interval || 600;
      
      // Only log every 5 seconds to reduce console spam
      if (Math.floor(elapsedSeconds) % 5 === 0) {
        console.log("VideoOverlay: Checking schedule:", { 
          elapsedSeconds, 
          interval: intervalTime,
          scheduleActive,
          isVisible,
          timeToNext: intervalTime - elapsedSeconds
        });
      }
      
      // Only activate if the interval has passed AND the overlay is not currently active
      if (elapsedSeconds >= intervalTime && !scheduleActive) {
        console.log("VideoOverlay: Time to reactivate overlay after interval");
        activateOverlay();
      }
    }, 1000); // Check every second
    
    setIntervalId(newIntervalId);
    
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [schedule.enabled, schedule.interval, schedule.duration, schedule.autoHide, preview, source]);
  
  // Handle video end for non-looping videos in scheduled mode
  const handleVideoEnded = () => {
    console.log("VideoOverlay: Video ended", {
      loop,
      scheduleAutoHide: schedule.autoHide,
      preview,
      scheduleEnabled: schedule.enabled,
      duration: schedule.duration,
      interval: schedule.interval
    });
    
    if (loop) {
      // For looping videos, we need to ensure playback continues
      // This can be necessary as some browsers may not correctly loop videos
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(err => {
          console.error("Error restarting looped video:", err);
        });
      }
    } 
    else if (schedule.autoHide && !preview && schedule.enabled) {
      // For non-looping videos, follow the autoHide setting
      console.log("VideoOverlay: Non-looping video ended, hiding overlay");
      setIsVisible(false);
      setScheduleActive(false);
    }
    else {
      // Non-looping video, but autoHide is disabled, so keep it visible
      // but reset to the first frame
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  };
  
  // Controls for preview mode
  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(err => {
        console.error("Error playing video in preview:", err);
      });
      setIsVisible(true);
    }
  };
  
  // Don't render anything if not visible and not in preview mode
  if (!isVisible && !preview) {
    return null;
  }
  
  return (
    <div 
      className={`h-full w-full flex items-center justify-center overflow-hidden ${!isVisible && preview ? 'opacity-50' : ''}`}
      style={{
        backgroundColor: 'transparent', // Always transparent container
        borderRadius: style.borderRadius || '0',
        opacity: isVisible ? (style.opacity !== undefined ? style.opacity : 1) : 0.3,
        transition: 'opacity 0.5s ease-in-out',
        backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur})` : undefined
      }}
    >
      {source ? (
        <video
          ref={videoRef}
          src={source}
          className="w-full h-full object-contain"
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          playsInline
          onEnded={handleVideoEnded}
          style={{
            backgroundColor: 'transparent',
            objectFit: 'contain',
            width: '100%',
            height: '100%'
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-4">
          <p style={{ color: style.textColor || '#ffffff' }}>
            No video source selected
          </p>
        </div>
      )}
      
      {/* Controls for preview mode */}
      {preview && (
        <div className="absolute bottom-2 right-2 flex space-x-2 text-xs">
          <button 
            className="p-1 bg-primary/80 text-white rounded"
            onClick={handlePlay}
          >
            ▶️
          </button>
          <button 
            className="p-1 bg-primary/80 text-white rounded"
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? '👁️' : '👁️‍🗨️'}
          </button>
          {schedule.enabled && (
            <div className="p-1 bg-black/80 text-white rounded text-xs">
              {schedule.interval}s/{schedule.duration}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}