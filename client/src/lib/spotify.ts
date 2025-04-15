import { apiRequest } from '@/lib/queryClient';
import { SpotifySettings, SpotifyNowPlaying } from '@/lib/types';

/**
 * Connect to Spotify API
 * Opens a popup window for Spotify authentication
 */
export async function connectToSpotify(): Promise<void> {
  try {
    const response = await apiRequest("GET", "/api/spotify/auth", null);
    const data = await response.json();
    
    if (data.url) {
      window.open(data.url, "spotify-auth", "width=800,height=600");
    }
  } catch (error) {
    console.error("Failed to connect to Spotify:", error);
    throw error;
  }
}

/**
 * Disconnect from Spotify API
 * Updates the settings to remove all tokens and connection info
 */
export async function disconnectSpotify(): Promise<void> {
  try {
    await apiRequest("PUT", "/api/spotify/settings", {
      connected: false,
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined,
      email: undefined
    });
  } catch (error) {
    console.error("Failed to disconnect Spotify:", error);
    throw error;
  }
}

/**
 * Update Spotify settings
 */
export async function updateSpotifySettings(settings: Partial<SpotifySettings>): Promise<SpotifySettings> {
  try {
    const response = await apiRequest("PUT", "/api/spotify/settings", settings);
    return await response.json();
  } catch (error) {
    console.error("Failed to update Spotify settings:", error);
    throw error;
  }
}

/**
 * Get currently playing track from Spotify
 */
export async function getCurrentlyPlaying(): Promise<SpotifyNowPlaying | null> {
  try {
    const response = await apiRequest("GET", "/api/spotify/currently-playing", null);
    return await response.json();
  } catch (error) {
    console.error("Failed to get currently playing track:", error);
    return null;
  }
}

/**
 * Generate QR code URL for a Spotify track
 */
export function generateSpotifyQRCodeUrl(trackUrl: string): string {
  // Encode the Spotify track URL for the QR code
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackUrl)}`;
}
