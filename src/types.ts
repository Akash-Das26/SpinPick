export interface WheelItem {
  id: string;
  text: string;
  color: string;
  weight: number; // default 1
  enabled: boolean;
  icon?: string;
  imageUrl?: string; // custom image for wheel segment
  note?: string;
}

export type PointerPosition = 'top' | 'right' | 'bottom' | 'left';

export type SpinMode = 'classic' | 'elimination' | 'multi-winner' | 'teams' | 'quick-flip' | 'tournament';

export type WheelFontFamily =
  | 'Outfit'
  | 'Montserrat'
  | 'Bangers'
  | 'Space Grotesk'
  | 'Orbitron'
  | 'Playfair Display'
  | 'Pacifico'
  | 'Press Start 2P'
  | 'Righteous'
  | 'Caveat';

export interface WheelTheme {
  id: string;
  name: string;
  description: string;
  sliceColors: string[];
  rimColor: string;
  rimBorder: string;
  hubColor: string;
  hubBorder: string;
  needleColor: string;
  needleAccent: string;
  textColor: string;
  glowColor: string;
  bgGradient: string;
}

export type ConfettiIntensity = 'low' | 'normal' | 'high' | 'epic';

export interface WheelConfig {
  spinDuration: number; // in seconds (e.g. 5)
  spinSpeed: 'slow' | 'normal' | 'fast' | 'hyper';
  pointerPosition: PointerPosition;
  fontFamily: WheelFontFamily;
  fontSizeMultiplier: number; // 0.8 to 1.4
  textTransform: 'uppercase' | 'none' | 'capitalize';
  enableSound: boolean;
  soundVolume: number; // 0 to 1
  enableConfetti: boolean;
  confettiIntensity?: ConfettiIntensity; // Confetti particle density
  confettiDuration?: number; // Duration in seconds (1 - 10)
  mysteryMode: boolean; // Hide labels as '?'
  eliminationMode: boolean; // Auto-remove winner
  winningAnimation: 'confetti' | 'fireworks' | 'spotlight' | 'simple';
  title: string;
  description?: string;
  centerText?: string;
  authorName?: string;
}

export interface SpinHistoryItem {
  id: string;
  timestamp: number;
  winner: WheelItem;
  wheelTitle: string;
  mode: SpinMode;
  totalParticipants: number;
}

export interface SavedWheel {
  id: string;
  title: string;
  description?: string;
  category: 'custom' | 'food' | 'games' | 'party' | 'work' | 'fitness' | 'decision';
  items: WheelItem[];
  themeId: string;
  config: Partial<WheelConfig>;
  updatedAt: number;
  isBuiltIn?: boolean;
  userId?: string;
}

export interface TeamGroup {
  teamName: string;
  color: string;
  members: WheelItem[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: number;
  savedWheelIds?: string[];
}

export interface SharedWheelPayload {
  v: number; // version
  title: string;
  items: Array<{
    text: string;
    color: string;
    weight: number;
    icon?: string;
    imageUrl?: string;
  }>;
  themeId: string;
  fontFamily?: WheelFontFamily;
  author?: string;
}
