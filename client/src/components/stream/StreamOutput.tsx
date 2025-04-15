import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layer, Quote, SpotifyNowPlaying } from "@/lib/types";
import { QuoteOverlay } from "./QuoteOverlay";
import { SpotifyWidget } from "./SpotifyWidget";

export function StreamOutput() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [bgVideo, setBgVideo] = useState("");

  // Fetch layers
  const { data: layers = [] } = useQuery<Layer[]>({
    queryKey: ['/api/layers'],
    refetchInterval: 5000 // Check for layer updates every 5 seconds
  });

  // Fetch quotes
  const { data: quotesData = [] } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
    onSuccess: (data) => {
      setQuotes(data);
    }
  });

  // Get currently playing track from Spotify
  const { data: spotifyData } = useQuery<SpotifyNowPlaying>({
    queryKey: ['/api/spotify/currently-playing'],
    refetchInterval: 10000, // Check every 10 seconds
  });

  // Find the visible layers sorted by z-index
  const visibleLayers = layers
    .filter(layer => layer.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  // Get background layer
  const backgroundLayer = visibleLayers.find(layer => layer.type === 'background');
  
  // Get quote layer
  const quoteLayer = visibleLayers.find(layer => layer.type === 'quote');
  
  // Get Spotify layer
  const spotifyLayer = visibleLayers.find(layer => layer.type === 'spotify');

  // Get any additional layers
  const otherLayers = visibleLayers.filter(
    layer => layer.type !== 'background' && layer.type !== 'quote' && layer.type !== 'spotify'
  );

  // Rotate quotes every 30 seconds
  useEffect(() => {
    if (quotes.length > 1) {
      const quoteInterval = setInterval(() => {
        setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
      }, (quoteLayer?.content?.rotationInterval || 30) * 1000);
      
      return () => clearInterval(quoteInterval);
    }
  }, [quotes, quoteLayer]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Background Layer */}
      {backgroundLayer && (
        <div 
          className="absolute inset-0"
          style={{ zIndex: backgroundLayer.zIndex }}
        >
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <i className="ri-film-line text-5xl text-secondary/50"></i>
            <p className="text-secondary/50 ml-2">Background Video</p>
          </div>
        </div>
      )}
      
      {/* Quote Overlay */}
      {quoteLayer && quotes.length > 0 && (
        <div 
          className="absolute"
          style={{
            left: `${quoteLayer.position.x}px`,
            top: `${quoteLayer.position.y}px`,
            width: quoteLayer.position.width ? `${quoteLayer.position.width}px` : 'auto',
            height: quoteLayer.position.height ? `${quoteLayer.position.height}px` : 'auto',
            zIndex: quoteLayer.zIndex,
          }}
        >
          <QuoteOverlay 
            style={quoteLayer.style}
            quote={quotes[currentQuoteIndex]}
          />
        </div>
      )}
      
      {/* Spotify Widget */}
      {spotifyLayer && spotifyData && (
        <div 
          className="absolute"
          style={{
            left: `${spotifyLayer.position.x}px`,
            top: `${spotifyLayer.position.y}px`,
            width: spotifyLayer.position.width ? `${spotifyLayer.position.width}px` : 'auto',
            height: spotifyLayer.position.height ? `${spotifyLayer.position.height}px` : 'auto',
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
      
      {/* Other Layers */}
      {otherLayers.map(layer => (
        <div 
          key={layer.id}
          className="absolute"
          style={{
            left: `${layer.position.x}px`,
            top: `${layer.position.y}px`,
            width: layer.position.width ? `${layer.position.width}px` : 'auto',
            height: layer.position.height ? `${layer.position.height}px` : 'auto',
            zIndex: layer.zIndex,
          }}
        >
          {layer.type === 'logo' && (
            <div className="font-bold text-4xl text-accent/80 tracking-wider neon-accent">
              Focus Lo-Fi
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
