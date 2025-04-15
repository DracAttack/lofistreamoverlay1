// Types for our in-memory database schema

export interface User {
  id: number;
  username: string;
  password: string;
}

export interface Asset {
  id: number;
  name: string;
  type: 'video' | 'audio' | 'image' | 'text';
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface LayerPosition {
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
}

export interface LayerStyle {
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  backdropBlur?: string;
  [key: string]: any;
}

export interface LayerContent {
  source?: string;
  text?: string;
  rotationInterval?: number;
  timerEnabled?: boolean;
  timerDuration?: number; // in seconds
  timerDirection?: 'up' | 'down';
  timerStartTime?: string; // ISO string
  timerFormat?: 'hh:mm:ss' | 'mm:ss' | 'ss';
  
  // Scheduling options
  scheduleEnabled?: boolean;
  scheduleInterval?: number; // time between activations in seconds
  scheduleDuration?: number; // how long to stay visible in seconds
  scheduleAutoHide?: boolean; // hide when not in active period
  scheduleLoop?: boolean; // if false, play only once per activation
  
  [key: string]: any;
}

export interface Layer {
  id: number;
  name: string;
  type: 'background' | 'quote' | 'spotify' | 'logo';
  position: LayerPosition;
  style: LayerStyle;
  content: LayerContent;
  zIndex: number;
  visible: boolean;
}

export interface Layout {
  id: number;
  name: string;
  preview: string;
  layers: any;
  createdAt: string;
}

export interface Quote {
  id: number;
  text: string;
  author?: string;
  source?: string;
}

export interface SpotifySettings {
  id: number;
  connected: boolean;
  email?: string;
  showArtwork: boolean;
  generateQR: boolean;
  autoHideWhenPaused: boolean;
  refreshInterval: number;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  [key: string]: any;
}

export interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  url: string;
  duration: number;
  progress: number;
}

export interface SpotifyNowPlaying {
  isPlaying: boolean;
  track?: SpotifyTrack;
}
