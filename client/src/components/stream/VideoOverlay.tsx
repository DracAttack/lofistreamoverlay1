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
  
  // Check if it's a transparent WebM file
  useEffect(() => {
    if (source) {
      setIsTransparentWebm(/\.webm$/i.test(source));
    }
  }, [source]);
  
  // Schedule activation logic - only runs when not in preview mode
  useEffect(() => {
    if (preview || !schedule.enabled) {
      return;
    }

    console.log("Schedule settings:", {
      enabled: schedule.enabled,
      interval: schedule.interval,
      duration: schedule.duration,
      autoHide: schedule.autoHide
    });
    
    // Function to activate the overlay
    const activateOverlay = () => {
      console.log("Activating overlay");
      setIsVisible(true);
      setScheduleActive(true);
      
      // Reset video to beginning
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      
      // Schedule hide after duration
      if (schedule.autoHide) {
        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Set new timeout to hide the overlay
        const newTimeoutId = setTimeout(() => {
          console.log("Hiding overlay after duration", schedule.duration);
          setIsVisible(false);
          setScheduleActive(false);
        }, (schedule.duration || 5) * 1000);
        
        setTimeoutId(newTimeoutId);
      }
    };
    
    // Immediately activate on first mount
    if (lastActivation === 0) {
      activateOverlay();
      setLastActivation(Date.now());
    }
    
    // Set up interval for scheduled activation
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = (now - lastActivation) / 1000;
      
      console.log("Checking schedule:", { 
        elapsedSeconds, 
        interval: schedule.interval,
        scheduleActive
      });
      
      if (elapsedSeconds >= (schedule.interval || 600) && !scheduleActive) {
        console.log("Time to reactivate overlay");
        activateOverlay();
        setLastActivation(now);
      }
    }, 1000); // Check every second
    
    return () => {
      clearInterval(intervalId);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [schedule.enabled, schedule.interval, schedule.duration, 
      schedule.autoHide, lastActivation, preview, scheduleActive]);
  
  // Handle video end for non-looping videos in scheduled mode
  const handleVideoEnded = () => {
    if (!loop && schedule.autoHide && !preview && schedule.enabled) {
      console.log("Video ended, hiding overlay");
      setIsVisible(false);
      setScheduleActive(false);
    }
  };
  
  // Controls for preview mode
  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsVisible(true);
    }
  };
  
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
        </div>
      )}
    </div>
  );
}