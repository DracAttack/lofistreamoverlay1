import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Asset schema for uploaded files (videos, audios, images, text)
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // video, audio, image, text
  path: text("path").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
});

// Layer schema for layer positioning and styling
export const layers = pgTable("layers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // background, quote, spotify, logo
  position: jsonb("position").notNull(), // {x, y, width, height}
  style: jsonb("style").notNull(), // {backgroundColor, textColor, borderRadius, etc}
  content: jsonb("content").notNull(), // {source, text, etc}
  zIndex: integer("z_index").notNull(),
  visible: boolean("visible").default(true),
});

// Layout schema for saving complete layouts
export const layouts = pgTable("layouts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  preview: text("preview"),
  layers: jsonb("layers").notNull(),
  current: boolean("current").default(false),
  createdAt: text("created_at").notNull(),
});

// Current layout state - for real-time sync
export const activeLayout = pgTable("active_layout", {
  id: serial("id").primaryKey(),
  layers: jsonb("layers").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Quote schema for rotating quotes
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  author: text("author"),
  source: text("source"),
});

// Spotify settings schema
export const spotifySettings = pgTable("spotify_settings", {
  id: serial("id").primaryKey(),
  connected: boolean("connected").default(false),
  email: text("email"),
  showArtwork: boolean("show_artwork").default(true),
  generateQR: boolean("generate_qr").default(true),
  autoHideWhenPaused: boolean("auto_hide_when_paused").default(false),
  refreshInterval: integer("refresh_interval").default(10),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: text("expires_at"),
});

// Insert schemas
export const insertAssetSchema = createInsertSchema(assets).omit({ id: true });
export const insertLayerSchema = createInsertSchema(layers).omit({ id: true });
export const insertLayoutSchema = createInsertSchema(layouts).omit({ id: true, current: true });
export const insertActiveLayoutSchema = createInsertSchema(activeLayout).omit({ id: true, updatedAt: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true });
export const insertSpotifySettingsSchema = createInsertSchema(spotifySettings).omit({ id: true });

// Types
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type Layer = typeof layers.$inferSelect;
export type InsertLayer = z.infer<typeof insertLayerSchema>;

export type Layout = typeof layouts.$inferSelect;
export type InsertLayout = z.infer<typeof insertLayoutSchema>;

export type ActiveLayout = typeof activeLayout.$inferSelect;
export type InsertActiveLayout = z.infer<typeof insertActiveLayoutSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type SpotifySettings = typeof spotifySettings.$inferSelect;
export type InsertSpotifySettings = z.infer<typeof insertSpotifySettingsSchema>;

// For in-memory storage
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
