import {
  users, assets, layers, layouts, quotes, spotifySettings, activeLayout,
  type User, type InsertUser,
  type Asset, type InsertAsset,
  type Layer, type InsertLayer,
  type Layout, type InsertLayout,
  type Quote, type InsertQuote,
  type SpotifySettings, type InsertSpotifySettings,
  type ActiveLayout, type InsertActiveLayout
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Asset methods
  getAssets(): Promise<Asset[]>;
  getAssetsByType(type: string): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;
  
  // Layer methods
  getLayers(): Promise<Layer[]>;
  getLayer(id: number): Promise<Layer | undefined>;
  createLayer(layer: InsertLayer): Promise<Layer>;
  updateLayer(id: number, layer: Partial<InsertLayer>): Promise<Layer | undefined>;
  deleteLayer(id: number): Promise<boolean>;
  
  // Layout methods
  getLayouts(): Promise<Layout[]>;
  getLayout(id: number): Promise<Layout | undefined>;
  createLayout(layout: InsertLayout): Promise<Layout>;
  updateLayout(id: number, layout: Partial<InsertLayout>): Promise<Layout | undefined>;
  deleteLayout(id: number): Promise<boolean>;
  
  // Active Layout methods - for real-time sync
  getActiveLayout(): Promise<ActiveLayout | undefined>;
  updateActiveLayout(layerData: Layer[]): Promise<ActiveLayout>;
  
  // Quote methods
  getQuotes(): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: number): Promise<boolean>;
  
  // Spotify settings methods
  getSpotifySettings(): Promise<SpotifySettings | undefined>;
  updateSpotifySettings(settings: Partial<InsertSpotifySettings>): Promise<SpotifySettings | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const results = await db.insert(users).values(insertUser).returning();
    return results[0];
  }
  
  // Asset methods
  async getAssets(): Promise<Asset[]> {
    return await db.select().from(assets);
  }
  
  async getAssetsByType(type: string): Promise<Asset[]> {
    return await db.select().from(assets).where(eq(assets.type, type));
  }
  
  async getAsset(id: number): Promise<Asset | undefined> {
    const results = await db.select().from(assets).where(eq(assets.id, id));
    return results[0];
  }
  
  async createAsset(asset: InsertAsset): Promise<Asset> {
    const results = await db.insert(assets).values(asset).returning();
    return results[0];
  }
  
  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const results = await db.update(assets).set(asset).where(eq(assets.id, id)).returning();
    return results[0];
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    try {
      // First, remove the asset reference from any layers using it
      const allLayers = await this.getLayers();
      const updatedLayers: Layer[] = [];
      
      for (const layer of allLayers) {
        // Safely check if content exists and has a source property
        const content = layer.content as Record<string, any> || {};
        const source = content.source as string || "";
        
        if (source && source.includes(`/uploads/${id}-`)) {
          // Update the layer to remove the reference to this asset
          const updatedContent = { ...content, source: "" };
          await this.updateLayer(layer.id, { content: updatedContent });
          
          // Push the updated layer with the source removed
          updatedLayers.push({
            ...layer,
            content: updatedContent
          });
        } else {
          updatedLayers.push(layer);
        }
      }
      
      // Update active layout to reflect these changes
      await this.updateActiveLayout(updatedLayers);
      
      // Then delete the asset itself
      const results = await db.delete(assets).where(eq(assets.id, id)).returning({ id: assets.id });
      
      // Reset the auto-increment sequence for assets table so IDs start fresh
      // If there are still assets, use MAX(id), otherwise use 1 to prevent "value 0" error
      try {
        const maxIdResult = await db.select({ maxId: sql`COALESCE(MAX(id), 0)` }).from(assets);
        const maxId = maxIdResult[0]?.maxId || 0;
        
        if (maxId === 0) {
          // If no rows left, set to 1 (minimum valid value for most sequences)
          await db.execute(`ALTER SEQUENCE assets_id_seq RESTART WITH 1`);
        } else {
          // Otherwise set to the max ID
          await db.execute(`SELECT setval('assets_id_seq', ${maxId}, true)`);
        }
      } catch (seqError) {
        console.error("Error resetting asset sequence:", seqError);
        // Continue anyway - this error shouldn't prevent asset deletion
      }
      
      // For consistency, delete any files associated with this asset
      // (the actual file deletion would be handled by server/routes.ts)
      
      return results.length > 0;
    } catch (error) {
      console.error("Error deleting asset:", error);
      return false;
    }
  }
  
  // Layer methods
  async getLayers(): Promise<Layer[]> {
    return await db.select().from(layers).orderBy(layers.zIndex);
  }
  
  async getLayer(id: number): Promise<Layer | undefined> {
    const results = await db.select().from(layers).where(eq(layers.id, id));
    return results[0];
  }
  
  async createLayer(layer: InsertLayer): Promise<Layer> {
    const results = await db.insert(layers).values(layer).returning();
    // Also update the active layout
    const allLayers = await this.getLayers();
    await this.updateActiveLayout([...allLayers, results[0]]);
    return results[0];
  }
  
  async updateLayer(id: number, layer: Partial<InsertLayer>): Promise<Layer | undefined> {
    const results = await db.update(layers).set(layer).where(eq(layers.id, id)).returning();
    
    // Update the active layout on every layer change
    const allLayers = await this.getLayers();
    await this.updateActiveLayout(allLayers);
    
    return results[0];
  }
  
  async deleteLayer(id: number): Promise<boolean> {
    try {
      // First delete the layer
      const results = await db.delete(layers).where(eq(layers.id, id)).returning({ id: layers.id });
      
      // Update the active layout
      const allLayers = await this.getLayers();
      await this.updateActiveLayout(allLayers);
      
      // Reset the auto-increment sequence for layers so new IDs start fresh
      // If there are still layers, use MAX(id), otherwise use 1 to prevent "value 0" error
      try {
        const maxIdResult = await db.select({ maxId: sql`COALESCE(MAX(id), 0)` }).from(layers);
        const maxId = maxIdResult[0]?.maxId || 0;
        
        if (maxId === 0) {
          // If no rows left, set to 1 (minimum valid value for most sequences)
          await db.execute(`ALTER SEQUENCE layers_id_seq RESTART WITH 1`);
        } else {
          // Otherwise set to the max ID
          await db.execute(`SELECT setval('layers_id_seq', ${maxId}, true)`);
        }
      } catch (seqError) {
        console.error("Error resetting layer sequence:", seqError);
        // Continue anyway - this error shouldn't prevent layer deletion
      }
      
      return results.length > 0;
    } catch (error) {
      console.error("Error deleting layer:", error);
      return false;
    }
  }
  
  // Layout methods
  async getLayouts(): Promise<Layout[]> {
    return await db.select().from(layouts);
  }
  
  async getLayout(id: number): Promise<Layout | undefined> {
    const results = await db.select().from(layouts).where(eq(layouts.id, id));
    return results[0];
  }
  
  async createLayout(layout: InsertLayout): Promise<Layout> {
    const results = await db.insert(layouts).values(layout).returning();
    return results[0];
  }
  
  async updateLayout(id: number, layout: Partial<InsertLayout>): Promise<Layout | undefined> {
    const results = await db.update(layouts).set(layout).where(eq(layouts.id, id)).returning();
    return results[0];
  }
  
  async deleteLayout(id: number): Promise<boolean> {
    const results = await db.delete(layouts).where(eq(layouts.id, id)).returning({ id: layouts.id });
    return results.length > 0;
  }
  
  // Active Layout methods - for real-time sync
  async getActiveLayout(): Promise<ActiveLayout | undefined> {
    const results = await db.select().from(activeLayout).orderBy(desc(activeLayout.id)).limit(1);
    return results[0];
  }
  
  async updateActiveLayout(layerData: Layer[]): Promise<ActiveLayout> {
    // Get current active layout
    const current = await this.getActiveLayout();
    
    if (current) {
      // Update the existing record
      const results = await db.update(activeLayout)
        .set({ layers: layerData })
        .where(eq(activeLayout.id, current.id))
        .returning();
      return results[0];
    } else {
      // Create a new record
      const results = await db.insert(activeLayout)
        .values({ layers: layerData })
        .returning();
      return results[0];
    }
  }
  
  // Quote methods
  async getQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes);
  }
  
  async getQuote(id: number): Promise<Quote | undefined> {
    const results = await db.select().from(quotes).where(eq(quotes.id, id));
    return results[0];
  }
  
  async createQuote(quote: InsertQuote): Promise<Quote> {
    const results = await db.insert(quotes).values(quote).returning();
    return results[0];
  }
  
  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote | undefined> {
    const results = await db.update(quotes).set(quote).where(eq(quotes.id, id)).returning();
    return results[0];
  }
  
  async deleteQuote(id: number): Promise<boolean> {
    const results = await db.delete(quotes).where(eq(quotes.id, id)).returning({ id: quotes.id });
    return results.length > 0;
  }
  
  // Spotify settings methods
  async getSpotifySettings(): Promise<SpotifySettings | undefined> {
    const results = await db.select().from(spotifySettings).limit(1);
    return results[0];
  }
  
  async updateSpotifySettings(settings: Partial<InsertSpotifySettings>): Promise<SpotifySettings | undefined> {
    const current = await this.getSpotifySettings();
    
    if (current) {
      const results = await db.update(spotifySettings)
        .set(settings)
        .where(eq(spotifySettings.id, current.id))
        .returning();
      return results[0];
    } else {
      const results = await db.insert(spotifySettings)
        .values({ 
          connected: false,
          showArtwork: true,
          generateQR: true,
          autoHideWhenPaused: false,
          refreshInterval: 10,
          ...settings 
        })
        .returning();
      return results[0];
    }
  }
}

// Initialize some sample data
async function initializeData() {
  try {
    // Check if we have quotes
    const existingQuotes = await db.select().from(quotes);
    if (existingQuotes.length === 0) {
      // Add sample quotes
      await db.insert(quotes).values([
        {
          text: "I know that ache in your chest. Your story is still unfolding — even if it feels stuck.",
          author: "Hollowheart",
          source: "Tapes"
        },
        {
          text: "One loop at a time, friend. You're safe here. Stay a while.",
          author: "Hollowheart",
          source: "Tapes"
        }
      ]);
    }
    
    // Check if we have Spotify settings
    const existingSettings = await db.select().from(spotifySettings);
    if (existingSettings.length === 0) {
      // Add default settings
      await db.insert(spotifySettings).values({
        connected: false,
        showArtwork: true,
        generateQR: true,
        autoHideWhenPaused: false,
        refreshInterval: 10
      });
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Create instance and initialize data
export const storage = new DatabaseStorage();
initializeData();
