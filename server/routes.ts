import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import path from "path";
import fs from "fs";
import { WebSocket, WebSocketServer } from "ws";
import {
  insertAssetSchema,
  insertLayerSchema,
  insertLayoutSchema,
  insertQuoteSchema,
  insertSpotifySettingsSchema
} from "@shared/schema";
import { z } from "zod";
import SpotifyWebApi from "spotify-web-api-node";

// Create upload directory if it doesn't exist
const UPLOAD_DIR = path.join(import.meta.dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Create a WebSocket server for real-time updates with a specific path
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/overlay'
  });
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected to /ws/overlay");
    ws.on("close", () => console.log("WebSocket client disconnected"));
  });

  // Helper function to broadcast updates to all connected clients
  const broadcastUpdate = (type: string, data: any) => {
    const message = JSON.stringify({ type, data });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Serve static uploads
  app.use("/uploads", express.static(UPLOAD_DIR));

  // Setup Spotify API
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 
      (process.env.REPLIT_DOMAINS ? 
        `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/spotify/callback` : 
        "http://localhost:5000/api/spotify/callback")
  });

  // Asset routes
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const assets = await storage.getAssetsByType(type);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets by type" });
    }
  });

  app.post("/api/assets", express.json(), async (req, res) => {
    try {
      const assetData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(assetData);
      broadcastUpdate("asset_created", asset);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid asset data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create asset" });
      }
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.getAsset(parseInt(id));
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      // Delete file from uploads directory
      if (asset.path) {
        const filePath = path.join(UPLOAD_DIR, path.basename(asset.path));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      const success = await storage.deleteAsset(parseInt(id));
      if (success) {
        broadcastUpdate("asset_deleted", { id: parseInt(id) });
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Asset not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Layer routes
  app.get("/api/layers", async (req, res) => {
    try {
      const layers = await storage.getLayers();
      res.json(layers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch layers" });
    }
  });

  app.post("/api/layers", express.json(), async (req, res) => {
    try {
      const layerData = insertLayerSchema.parse(req.body);
      const layer = await storage.createLayer(layerData);
      broadcastUpdate("layer_created", layer);
      res.status(201).json(layer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid layer data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create layer" });
      }
    }
  });

  app.put("/api/layers/:id", express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const layerData = req.body;
      const layer = await storage.updateLayer(parseInt(id), layerData);
      
      if (layer) {
        broadcastUpdate("layer_updated", layer);
        res.json(layer);
      } else {
        res.status(404).json({ message: "Layer not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update layer" });
    }
  });

  app.delete("/api/layers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteLayer(parseInt(id));
      
      if (success) {
        broadcastUpdate("layer_deleted", { id: parseInt(id) });
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Layer not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete layer" });
    }
  });

  // Layout routes
  app.get("/api/layouts", async (req, res) => {
    try {
      const layouts = await storage.getLayouts();
      res.json(layouts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch layouts" });
    }
  });

  app.post("/api/layouts", express.json(), async (req, res) => {
    try {
      const layoutData = insertLayoutSchema.parse(req.body);
      const layout = await storage.createLayout(layoutData);
      broadcastUpdate("layout_created", layout);
      res.status(201).json(layout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid layout data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create layout" });
      }
    }
  });

  app.delete("/api/layouts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteLayout(parseInt(id));
      
      if (success) {
        broadcastUpdate("layout_deleted", { id: parseInt(id) });
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Layout not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete layout" });
    }
  });

  // Quote routes
  app.get("/api/quotes", async (req, res) => {
    try {
      const quotes = await storage.getQuotes();
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.post("/api/quotes", express.json(), async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(quoteData);
      broadcastUpdate("quote_created", quote);
      res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create quote" });
      }
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteQuote(parseInt(id));
      
      if (success) {
        broadcastUpdate("quote_deleted", { id: parseInt(id) });
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Quote not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Spotify routes
  app.get("/api/spotify/settings", async (req, res) => {
    try {
      const settings = await storage.getSpotifySettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Spotify settings" });
    }
  });

  app.put("/api/spotify/settings", express.json(), async (req, res) => {
    try {
      const settingsData = req.body;
      const settings = await storage.updateSpotifySettings(settingsData);
      
      if (settings) {
        // Don't broadcast tokens for security
        const { accessToken, refreshToken, ...safeSettings } = settings;
        broadcastUpdate("spotify_settings_updated", safeSettings);
        res.json(settings);
      } else {
        res.status(404).json({ message: "Spotify settings not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update Spotify settings" });
    }
  });

  app.get("/api/spotify/auth", async (req, res) => {
    const scopes = ['user-read-private', 'user-read-email', 'user-read-currently-playing', 'user-read-playback-state'];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'spotify_auth_state');
    res.json({ url: authorizeURL });
  });

  app.get("/api/spotify/callback", async (req, res) => {
    const { code } = req.query;
    
    try {
      const data = await spotifyApi.authorizationCodeGrant(code as string);
      
      // Save tokens to storage
      await storage.updateSpotifySettings({
        connected: true,
        accessToken: data.body.access_token,
        refreshToken: data.body.refresh_token,
        expiresAt: (Date.now() + data.body.expires_in * 1000).toString()
      });
      
      // Set the tokens for future API calls
      spotifyApi.setAccessToken(data.body.access_token);
      spotifyApi.setRefreshToken(data.body.refresh_token);
      
      // Get user details
      const userProfile = await spotifyApi.getMe();
      
      await storage.updateSpotifySettings({
        email: userProfile.body.email
      });
      
      // Redirect to client with success
      res.redirect('/#/spotify-connected');
    } catch (error) {
      console.error('Spotify authorization error:', error);
      res.redirect('/#/spotify-error');
    }
  });

  app.get("/api/spotify/currently-playing", async (req, res) => {
    try {
      const settings = await storage.getSpotifySettings();
      
      if (!settings?.connected || !settings.accessToken) {
        return res.status(401).json({ message: "Spotify not connected" });
      }
      
      // Check if token is expired and refresh if needed
      if (settings.expiresAt && parseInt(settings.expiresAt) < Date.now()) {
        if (settings.refreshToken) {
          try {
            spotifyApi.setRefreshToken(settings.refreshToken);
            const refreshData = await spotifyApi.refreshAccessToken();
            
            // Update tokens
            await storage.updateSpotifySettings({
              accessToken: refreshData.body.access_token,
              expiresAt: (Date.now() + refreshData.body.expires_in * 1000).toString()
            });
            
            spotifyApi.setAccessToken(refreshData.body.access_token);
          } catch (refreshError) {
            return res.status(401).json({ message: "Failed to refresh Spotify token" });
          }
        } else {
          return res.status(401).json({ message: "Spotify session expired" });
        }
      }
      
      // Set access token and make API call
      spotifyApi.setAccessToken(settings.accessToken);
      const currentlyPlaying = await spotifyApi.getMyCurrentPlayingTrack();
      
      if (!currentlyPlaying.body || !currentlyPlaying.body.item) {
        return res.json({ isPlaying: false });
      }
      
      const track = currentlyPlaying.body.item;
      const response = {
        isPlaying: currentlyPlaying.body.is_playing,
        track: {
          name: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          album: track.album.name,
          albumArt: track.album.images[0]?.url,
          url: track.external_urls.spotify,
          duration: track.duration_ms,
          progress: currentlyPlaying.body.progress_ms
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching currently playing:', error);
      res.status(500).json({ message: "Failed to fetch currently playing track" });
    }
  });

  // File upload handling with Express built-in middleware
  app.post("/api/upload", express.raw({ limit: "50mb", type: "application/octet-stream" }), async (req: Request, res: Response) => {
    try {
      const contentType = req.headers["content-type"] || "";
      const fileName = req.headers["x-file-name"] as string;
      const fileType = req.headers["x-file-type"] as string;
      
      if (!fileName) {
        return res.status(400).json({ message: "File name is required" });
      }
      
      // Create a unique filename
      const uniqueFileName = `${Date.now()}-${fileName}`;
      const filePath = path.join(UPLOAD_DIR, uniqueFileName);
      
      // Save the file
      await fs.promises.writeFile(filePath, req.body);
      
      // Determine asset type
      let assetType = "unknown";
      if (contentType.includes("video")) {
        assetType = "video";
      } else if (contentType.includes("audio")) {
        assetType = "audio";
      } else if (contentType.includes("image")) {
        assetType = "image";
      } else if (contentType.includes("text") || contentType.includes("application/json")) {
        assetType = "text";
      }
      
      // Create asset record
      const asset = await storage.createAsset({
        name: fileName,
        type: assetType,
        path: `/uploads/${uniqueFileName}`,
        size: req.body.length,
        mimeType: contentType,
        uploadedAt: new Date().toISOString()
      });
      
      broadcastUpdate("asset_created", asset);
      
      res.status(201).json(asset);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  return httpServer;
}
