import { useState, useEffect } from "react";
import { SpotifyTrack } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";

interface SpotifyWidgetProps {
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    backdropBlur?: string;
  };
  track?: SpotifyTrack;
  isPlaying?: boolean;
  preview?: boolean;
}

export function SpotifyWidget({ 
  style = {}, 
  track, 
  isPlaying = false,
  preview = false 
}: SpotifyWidgetProps) {
  const [qrValue, setQrValue] = useState<string>("");
  
  useEffect(() => {
    // Set QR code value to the track URL or a placeholder
    if (track?.url) {
      setQrValue(track.url);
    } else {
      setQrValue("https://open.spotify.com");
    }
  }, [track]);

  const bgColor = style.backgroundColor || "rgba(0, 0, 0, 0.75)";
  const textColor = style.textColor || "#1DB954";
  const borderRadius = style.borderRadius || "8px";
  const backdropFilter = style.backdropBlur ? `blur(8px)` : "none";

  const containerStyle = {
    backgroundColor: bgColor,
    color: textColor,
    borderRadius,
    backdropFilter,
    border: "1px solid rgba(29, 185, 84, 0.3)",
  };

  // If this is a preview, or if auto-hide is enabled and music is paused, we might not show the widget
  // For now we always show it in preview mode
  const shouldShow = preview || isPlaying;

  if (!shouldShow && !preview) {
    return null;
  }

  return (
    <div 
      className="neon-border w-64 backdrop-blur-sm rounded-lg p-4"
      style={containerStyle}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <i className="ri-spotify-fill text-primary text-2xl mr-2"></i>
          <div className="text-sm">
            <div className="font-medium">LISTEN ON SPOTIFY</div>
          </div>
        </div>
        <div className="h-20 w-20 bg-background/50 rounded flex items-center justify-center">
          {/* QR Code */}
          <QRCodeSVG 
            value={qrValue} 
            size={64} 
            bgColor="transparent" 
            fgColor="#FFFFFF" 
            level="M" 
            className="rounded" 
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-primary/20 rounded flex items-center justify-center">
          {track?.albumArt ? (
            <img 
              src={track.albumArt} 
              alt={track.album || "Album Art"} 
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <i className="ri-music-fill text-primary text-xl"></i>
          )}
        </div>
        <div>
          <div className="font-medium">{track?.name || (preview ? "Drifting Dandelions" : "Not Playing")}</div>
          <div className="text-sm text-foreground/70">{track?.artist || (preview ? "The Hollowheart Tapes" : "")}</div>
        </div>
      </div>
    </div>
  );
}
