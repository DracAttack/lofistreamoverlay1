import {
  users, assets, layers, layouts, quotes, spotifySettings,
  type User, type InsertUser,
  type Asset, type InsertAsset,
  type Layer, type InsertLayer,
  type Layout, type InsertLayout,
  type Quote, type InsertQuote,
  type SpotifySettings, type InsertSpotifySettings
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assets: Map<number, Asset>;
  private layers: Map<number, Layer>;
  private layouts: Map<number, Layout>;
  private quotes: Map<number, Quote>;
  private spotifySettings?: SpotifySettings;
  
  private currentUserId: number;
  private currentAssetId: number;
  private currentLayerId: number;
  private currentLayoutId: number;
  private currentQuoteId: number;
  private currentSpotifySettingsId: number;

  constructor() {
    this.users = new Map();
    this.assets = new Map();
    this.layers = new Map();
    this.layouts = new Map();
    this.quotes = new Map();
    
    this.currentUserId = 1;
    this.currentAssetId = 1;
    this.currentLayerId = 1;
    this.currentLayoutId = 1;
    this.currentQuoteId = 1;
    this.currentSpotifySettingsId = 1;
    
    // Initialize with sample quotes
    this.createQuote({
      text: "I know that ache in your chest. Your story is still unfolding — even if it feels stuck.",
      author: "Hollowheart",
      source: "Tapes"
    });
    
    this.createQuote({
      text: "One loop at a time, friend. You're safe here. Stay a while.",
      author: "Hollowheart",
      source: "Tapes"
    });
    
    // Initialize default Spotify settings
    this.spotifySettings = {
      id: this.currentSpotifySettingsId++,
      connected: false,
      email: undefined,
      showArtwork: true,
      generateQR: true,
      autoHideWhenPaused: false,
      refreshInterval: 10,
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined
    };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Asset methods
  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values());
  }
  
  async getAssetsByType(type: string): Promise<Asset[]> {
    return Array.from(this.assets.values()).filter(asset => asset.type === type);
  }
  
  async getAsset(id: number): Promise<Asset | undefined> {
    return this.assets.get(id);
  }
  
  async createAsset(asset: InsertAsset): Promise<Asset> {
    const id = this.currentAssetId++;
    const newAsset: Asset = { ...asset, id };
    this.assets.set(id, newAsset);
    return newAsset;
  }
  
  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const existingAsset = this.assets.get(id);
    if (!existingAsset) return undefined;
    
    const updatedAsset: Asset = { ...existingAsset, ...asset, id };
    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    return this.assets.delete(id);
  }
  
  // Layer methods
  async getLayers(): Promise<Layer[]> {
    return Array.from(this.layers.values());
  }
  
  async getLayer(id: number): Promise<Layer | undefined> {
    return this.layers.get(id);
  }
  
  async createLayer(layer: InsertLayer): Promise<Layer> {
    const id = this.currentLayerId++;
    const newLayer: Layer = { ...layer, id };
    this.layers.set(id, newLayer);
    return newLayer;
  }
  
  async updateLayer(id: number, layer: Partial<InsertLayer>): Promise<Layer | undefined> {
    const existingLayer = this.layers.get(id);
    if (!existingLayer) return undefined;
    
    const updatedLayer: Layer = { ...existingLayer, ...layer, id };
    this.layers.set(id, updatedLayer);
    return updatedLayer;
  }
  
  async deleteLayer(id: number): Promise<boolean> {
    return this.layers.delete(id);
  }
  
  // Layout methods
  async getLayouts(): Promise<Layout[]> {
    return Array.from(this.layouts.values());
  }
  
  async getLayout(id: number): Promise<Layout | undefined> {
    return this.layouts.get(id);
  }
  
  async createLayout(layout: InsertLayout): Promise<Layout> {
    const id = this.currentLayoutId++;
    const newLayout: Layout = { ...layout, id };
    this.layouts.set(id, newLayout);
    return newLayout;
  }
  
  async updateLayout(id: number, layout: Partial<InsertLayout>): Promise<Layout | undefined> {
    const existingLayout = this.layouts.get(id);
    if (!existingLayout) return undefined;
    
    const updatedLayout: Layout = { ...existingLayout, ...layout, id };
    this.layouts.set(id, updatedLayout);
    return updatedLayout;
  }
  
  async deleteLayout(id: number): Promise<boolean> {
    return this.layouts.delete(id);
  }
  
  // Quote methods
  async getQuotes(): Promise<Quote[]> {
    return Array.from(this.quotes.values());
  }
  
  async getQuote(id: number): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }
  
  async createQuote(quote: InsertQuote): Promise<Quote> {
    const id = this.currentQuoteId++;
    const newQuote: Quote = { ...quote, id };
    this.quotes.set(id, newQuote);
    return newQuote;
  }
  
  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote | undefined> {
    const existingQuote = this.quotes.get(id);
    if (!existingQuote) return undefined;
    
    const updatedQuote: Quote = { ...existingQuote, ...quote, id };
    this.quotes.set(id, updatedQuote);
    return updatedQuote;
  }
  
  async deleteQuote(id: number): Promise<boolean> {
    return this.quotes.delete(id);
  }
  
  // Spotify settings methods
  async getSpotifySettings(): Promise<SpotifySettings | undefined> {
    return this.spotifySettings;
  }
  
  async updateSpotifySettings(settings: Partial<InsertSpotifySettings>): Promise<SpotifySettings | undefined> {
    if (!this.spotifySettings) return undefined;
    
    this.spotifySettings = { ...this.spotifySettings, ...settings };
    return this.spotifySettings;
  }
}

export const storage = new MemStorage();
