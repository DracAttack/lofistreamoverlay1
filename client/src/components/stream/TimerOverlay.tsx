import React, { useState, useEffect } from 'react';

interface TimerOverlayProps {
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    backdropBlur?: string;
  };
  timerConfig?: {
    duration?: number; // in seconds
    direction?: 'up' | 'down';
    startTime?: string; // ISO string
    format?: 'hh:mm:ss' | 'mm:ss' | 'ss';
  };
  preview?: boolean;
}

export function TimerOverlay({ 
  style = {
    backgroundColor: 'rgba(0,0,0,0.5)',
    textColor: '#ffffff',
    borderRadius: '8px',
    backdropBlur: 'backdrop-blur-sm'
  },
  timerConfig = {
    duration: 300, // 5 minutes
    direction: 'down',
    format: 'mm:ss'
  },
  preview = false
}: TimerOverlayProps) {
  const [time, setTime] = useState<number>(timerConfig.duration || 300);
  const [isRunning, setIsRunning] = useState<boolean>(!preview);
  
  // Set up timer based on direction (count up or down)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => {
          if (timerConfig.direction === 'down') {
            // Count down but don't go below zero
            return Math.max(0, prevTime - 1);
          } else {
            // Count up
            return prevTime + 1;
          }
        });
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timerConfig.direction]);
  
  // Reset timer if duration changes
  useEffect(() => {
    if (timerConfig.duration !== undefined) {
      if (timerConfig.direction === 'down') {
        setTime(timerConfig.duration);
      } else {
        setTime(0);
      }
    }
  }, [timerConfig.duration, timerConfig.direction]);
  
  // If there's a specific start time, calculate the elapsed time since then
  useEffect(() => {
    if (timerConfig.startTime && timerConfig.direction === 'up') {
      const startTime = new Date(timerConfig.startTime).getTime();
      const currentTime = new Date().getTime();
      const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
      setTime(elapsedSeconds);
    }
  }, [timerConfig.startTime, timerConfig.direction]);
  
  // Format time as hh:mm:ss, mm:ss, or ss based on format
  const formatTime = () => {
    const format = timerConfig.format || 'mm:ss';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    
    if (format === 'hh:mm:ss') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (format === 'mm:ss') {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return seconds.toString().padStart(2, '0');
    }
  };
  
  // Decide on size of timer based on format
  const timerSize = timerConfig.format === 'hh:mm:ss' ? 'text-3xl' : timerConfig.format === 'mm:ss' ? 'text-4xl' : 'text-5xl';
  
  return (
    <div 
      className={`h-full w-full flex items-center justify-center ${style.backdropBlur || ''}`}
      style={{
        backgroundColor: style.backgroundColor || 'rgba(0,0,0,0.5)',
        borderRadius: style.borderRadius || '8px',
        overflow: 'hidden',
      }}
    >
      <div className={`timer-display ${timerSize} font-mono font-bold`} style={{ color: style.textColor || '#ffffff' }}>
        {formatTime()}
      </div>
      
      {/* Timer controls for preview mode */}
      {preview && (
        <div className="absolute bottom-2 right-2 flex space-x-2 text-xs">
          <button 
            className="p-1 bg-primary/80 text-white rounded"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? '⏸️' : '▶️'}
          </button>
          <button 
            className="p-1 bg-primary/80 text-white rounded"
            onClick={() => {
              if (timerConfig.direction === 'down') {
                setTime(timerConfig.duration || 300);
              } else {
                setTime(0);
              }
            }}
          >
            🔄
          </button>
        </div>
      )}
    </div>
  );
}