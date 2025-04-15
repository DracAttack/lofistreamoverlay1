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
  wss.on("connection", async (ws) => {
    console.log("WebSocket client connected to /ws/overlay");
    
    // Send the current active layout to the new client
    try {
      const activeLayoutData = await storage.getActiveLayout();
      if (activeLayoutData) {
        ws.send(JSON.stringify({
          type: "active_layout_updated",
          data: activeLayoutData.layers
        }));
      } else {
        // If no active layout exists yet, send all layers
        const allLayers = await storage.getLayers();
        ws.send(JSON.stringify({
          type: "active_layout_updated",
          data: allLayers
        }));
        
        // Initialize the active layout with current layers
        if (allLayers.length > 0) {
          await storage.updateActiveLayout(allLayers);
        }
      }
    } catch (error) {
      console.error("Error sending initial layout data:", error);
    }
    
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
      const assetId = parseInt(id);
      const asset = await storage.getAsset(assetId);
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      console.log(`Deleting asset ID ${assetId}: ${asset.name}`);
      
      // Delete file from uploads directory
      if (asset.path) {
        try {
          const filePath = path.join(UPLOAD_DIR, path.basename(asset.path));
          console.log(`Checking for file at: ${filePath}`);
          
          if (fs.existsSync(filePath)) {
            console.log(`File exists, deleting: ${filePath}`);
            fs.unlinkSync(filePath);
          } else {
            console.log(`File not found: ${filePath}`);
          }
        } catch (fileError) {
          console.error("Error deleting file:", fileError);
          // Continue with asset deletion even if file deletion fails
        }
      }
      
      // Delete asset from database
      const success = await storage.deleteAsset(assetId);
      if (success) {
        console.log(`Successfully deleted asset ID ${assetId}`);
        
        // Find all files in uploads directory with this asset ID
        try {
          const files = fs.readdirSync(UPLOAD_DIR);
          const assetFiles = files.filter(file => file.startsWith(`${assetId}-`));
          
          if (assetFiles.length > 0) {
            console.log(`Found ${assetFiles.length} additional files for asset ID ${assetId}`);
            assetFiles.forEach(file => {
              const filePath = path.join(UPLOAD_DIR, file);
              console.log(`Deleting related file: ${filePath}`);
              fs.unlinkSync(filePath);
            });
          }
        } catch (cleanupError) {
          console.error("Error during file cleanup:", cleanupError);
        }
        
        // Notify clients
        broadcastUpdate("asset_deleted", { id: assetId });
        res.json({ 
          success: true,
          message: "Asset and associated files completely removed" 
        });
      } else {
        res.status(404).json({ message: "Failed to delete asset from database" });
      }
    } catch (error) {
      console.error("Error deleting asset:", error);
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
      const layerId = parseInt(id);
      
      // Get the layer first to check if it references any assets
      const layer = await storage.getLayer(layerId);
      if (!layer) {
        return res.status(404).json({ message: "Layer not found" });
      }
      
      console.log(`Deleting layer ID ${layerId}: ${layer.name}`);
      
      // Proceed with deletion
      const success = await storage.deleteLayer(layerId);
      
      if (success) {
        // Let all connected clients know this layer is gone
        broadcastUpdate("layer_deleted", { id: layerId });
        
        console.log(`Successfully deleted layer ID ${layerId}`);
        res.json({ 
          success: true,
          message: "Layer completely removed from database" 
        });
      } else {
        res.status(404).json({ message: "Layer not found or could not be deleted" });
      }
    } catch (error) {
      console.error("Error deleting layer:", error);
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
  
  // Active Layout routes - for real-time sync
  app.get("/api/active-layout", async (req, res) => {
    try {
      const activeLayout = await storage.getActiveLayout();
      if (activeLayout) {
        res.json(activeLayout);
      } else {
        // If no active layout exists, return all layers
        const layers = await storage.getLayers();
        res.json({ id: 0, layers, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Error fetching active layout:", error);
      res.status(500).json({ message: "Failed to fetch active layout" });
    }
  });
  
  app.post("/api/active-layout/sync", express.json(), async (req, res) => {
    try {
      let { layers } = req.body;
      if (!Array.isArray(layers)) {
        return res.status(400).json({ message: "Invalid data format. Expected layers array." });
      }
      
      // Get existing layers if available
      const existingLayers = await storage.getLayers();
      
      // Deduplicate layers by ID to prevent duplicate broadcasting
      const layerMap = new Map();
      
      // First add existing layers to the map
      existingLayers.forEach(layer => {
        layerMap.set(layer.id, layer);
      });
      
      // Then add/override with the incoming layers
      layers.forEach(layer => {
        // Make sure all required layer fields are present
        if (layer && layer.id) {
          layerMap.set(layer.id, {
            ...layerMap.get(layer.id), // Get existing layer data as base
            ...layer, // Override with new data
          });
        }
      });
      
      // Convert map back to array
      layers = Array.from(layerMap.values());
      
      // Update active layout in storage
      const activeLayout = await storage.updateActiveLayout(layers);
      
      // Log success for debugging
      console.log(`Active layout synchronized with ${layers.length} layers`);
      
      // Broadcast update to all connected clients
      broadcastUpdate("active_layout_updated", layers);
      
      res.json(activeLayout);
    } catch (error) {
      console.error("Error syncing active layout:", error);
      res.status(500).json({ message: "Failed to sync active layout" });
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

  // Fallback middleware to catch all requests if content-type doesn't match raw parser
  app.use("/api/upload", (req, res, next) => {
    if (req.method === "POST" && !req.is("application/octet-stream") && !req.is("image/*") && !req.is("video/*") && !req.is("audio/*") && !req.is("text/*")) {
      let data: Buffer[] = [];
      req.on('data', (chunk) => {
        data.push(chunk);
      });
      req.on('end', () => {
        req.body = Buffer.concat(data);
        next();
      });
    } else {
      next();
    }
  });
  
  // File upload handling with Express built-in middleware
  app.post("/api/upload", express.raw({ limit: "100mb", type: ["application/octet-stream", "image/*", "video/*", "audio/*", "text/*"] }), async (req: Request, res: Response) => {
    try {
      const contentType = req.headers["content-type"] || "";
      let fileName = req.headers["x-file-name"] as string;
      const fileType = req.headers["x-file-type"] as string;
      
      console.log("Upload headers:", {
        contentType,
        fileName,
        fileType,
        headers: req.headers
      });
      
      if (!fileName) {
        return res.status(400).json({ message: "File name is required" });
      }
      
      // Decode the filename if it's URL encoded
      fileName = decodeURIComponent(fileName);
      
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
