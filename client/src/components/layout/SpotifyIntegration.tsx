import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { SpotifySettings } from "@/lib/types";

export function SpotifyIntegration() {
  const [settings, setSettings] = useState<SpotifySettings | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<SpotifySettings>({
    queryKey: ['/api/spotify/settings'],
    onSuccess: (data) => {
      setSettings(data);
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<SpotifySettings>) => {
      await apiRequest("PUT", "/api/spotify/settings", updatedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spotify/settings'] });
      toast({
        title: "Success",
        description: "Spotify settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update Spotify settings",
        variant: "destructive",
      });
    },
  });

  const handleToggleChange = (field: keyof SpotifySettings) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      [field]: !settings[field]
    };
    
    setSettings(updatedSettings);
    updateSettingsMutation.mutate({ [field]: !settings[field] });
  };

  const handleRefreshIntervalChange = (value: string) => {
    if (!settings) return;
    
    const interval = parseInt(value);
    
    const updatedSettings = {
      ...settings,
      refreshInterval: interval
    };
    
    setSettings(updatedSettings);
    updateSettingsMutation.mutate({ refreshInterval: interval });
  };

  const handleConnectSpotify = async () => {
    try {
      const response = await apiRequest("GET", "/api/spotify/auth", null);
      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, "spotify-auth", "width=800,height=600");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to Spotify",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectSpotify = async () => {
    if (confirm("Are you sure you want to disconnect Spotify?")) {
      try {
        await updateSettingsMutation.mutateAsync({
          connected: false,
          accessToken: undefined,
          refreshToken: undefined,
          expiresAt: undefined,
          email: undefined
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to disconnect Spotify",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-4 border border-primary/20">
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <i className="ri-spotify-fill text-primary text-xl"></i>
          <h2 className="font-heading font-semibold text-lg">Spotify</h2>
        </div>
        <div className="relative inline-block w-10 mr-2 align-middle select-none">
          <input 
            type="checkbox" 
            id="toggle-spotify-integration" 
            checked={settings?.connected || false} 
            onChange={() => settings?.connected ? handleDisconnectSpotify() : handleConnectSpotify()}
            className="absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
            style={{
              right: settings?.connected ? '0' : 'auto',
              borderColor: settings?.connected ? 'hsl(var(--primary))' : 'transparent'
            }}
          />
          <label 
            htmlFor="toggle-spotify-integration" 
            className="block overflow-hidden h-5 rounded-full cursor-pointer"
            style={{
              backgroundColor: settings?.connected ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
            }}
          ></label>
        </div>
      </div>
      
      {settings?.connected ? (
        <>
          {/* Connected Account */}
          <div className="bg-background rounded p-3 mb-4 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Connected Account</span>
              <span className="text-xs py-0.5 px-2 bg-primary/20 text-primary rounded">Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <i className="ri-user-line text-primary"></i>
              </div>
              <div>
                <div className="text-sm font-medium">{settings.email || "Spotify User"}</div>
                <div className="text-xs text-foreground/60">Connected account</div>
              </div>
            </div>
          </div>
          
          {/* Spotify Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Show album artwork</span>
              <div className="relative inline-block w-10 align-middle select-none">
                <input 
                  type="checkbox" 
                  id="toggle-spotify-artwork" 
                  checked={settings.showArtwork || false} 
                  onChange={() => handleToggleChange('showArtwork')}
                  className="absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  style={{
                    right: settings.showArtwork ? '0' : 'auto',
                    borderColor: settings.showArtwork ? 'hsl(var(--primary))' : 'transparent'
                  }}
                />
                <label 
                  htmlFor="toggle-spotify-artwork" 
                  className="block overflow-hidden h-5 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: settings.showArtwork ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                  }}
                ></label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Generate QR code for track</span>
              <div className="relative inline-block w-10 align-middle select-none">
                <input 
                  type="checkbox" 
                  id="toggle-spotify-qr" 
                  checked={settings.generateQR || false} 
                  onChange={() => handleToggleChange('generateQR')}
                  className="absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  style={{
                    right: settings.generateQR ? '0' : 'auto',
                    borderColor: settings.generateQR ? 'hsl(var(--primary))' : 'transparent'
                  }}
                />
                <label 
                  htmlFor="toggle-spotify-qr" 
                  className="block overflow-hidden h-5 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: settings.generateQR ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                  }}
                ></label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-hide when paused</span>
              <div className="relative inline-block w-10 align-middle select-none">
                <input 
                  type="checkbox" 
                  id="toggle-spotify-autohide" 
                  checked={settings.autoHideWhenPaused || false} 
                  onChange={() => handleToggleChange('autoHideWhenPaused')}
                  className="absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  style={{
                    right: settings.autoHideWhenPaused ? '0' : 'auto',
                    borderColor: settings.autoHideWhenPaused ? 'hsl(var(--primary))' : 'transparent'
                  }}
                />
                <label 
                  htmlFor="toggle-spotify-autohide" 
                  className="block overflow-hidden h-5 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: settings.autoHideWhenPaused ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                  }}
                ></label>
              </div>
            </div>
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Refresh interval</label>
              <select 
                className="w-full bg-background border border-primary/30 rounded px-2 py-1 text-sm"
                value={settings.refreshInterval || 10}
                onChange={(e) => handleRefreshIntervalChange(e.target.value)}
              >
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
              </select>
            </div>
            <div className="pt-2">
              <button 
                className="w-full bg-destructive/80 text-destructive-foreground hover:bg-destructive py-1.5 mt-2 rounded text-sm transition-colors"
                onClick={handleDisconnectSpotify}
              >
                Disconnect Spotify
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <i className="ri-spotify-fill text-4xl text-primary"></i>
          <div className="text-center">
            <h3 className="font-medium mb-1">Connect to Spotify</h3>
            <p className="text-sm text-foreground/70 mb-4">Display your currently playing music on your stream overlay</p>
          </div>
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors w-full max-w-xs"
            onClick={handleConnectSpotify}
          >
            Connect Spotify Account
          </button>
        </div>
      )}
    </div>
  );
}
