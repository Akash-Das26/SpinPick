import React, { useState, useEffect, useCallback } from 'react';
import {
  WheelItem,
  WheelConfig,
  WheelTheme,
  SpinHistoryItem,
  SavedWheel,
  SpinMode,
  UserProfile,
} from './types';
import { PRESET_WHEELS } from './utils/presets';
import { getTheme, WHEEL_THEMES } from './utils/themes';
import { sound } from './utils/audio';
import { authService } from './utils/auth';
import { decodeWheelFromUrl } from './utils/share';

import { SpinWheel } from './components/SpinWheel';
import { WheelEditor } from './components/WheelEditor';
import { WinnerModal } from './components/WinnerModal';
import { SavedWheelsModal } from './components/SavedWheelsModal';
import { WheelSettingsModal } from './components/WheelSettingsModal';
import { HistoryStatsDrawer } from './components/HistoryStatsDrawer';
import { TeamsGenerator } from './components/TeamsGenerator';
import { FullscreenStage } from './components/FullscreenStage';
import { QuickFlipModal } from './components/QuickFlipModal';
import { AuthModal } from './components/AuthModal';
import { ShareWheelModal } from './components/ShareWheelModal';
import { HotkeyGuide } from './components/HotkeyGuide';
import { ExporterModal } from './components/ExporterModal';
import { TournamentMode } from './components/TournamentMode';
import { OnboardingTour } from './components/OnboardingTour';
const HowItWorks = React.lazy(() => import('./components/HowItWorks').then(m => ({ default: m.HowItWorks })));

import {
  Play,
  RotateCw,
  Maximize2,
  Volume2,
  VolumeX,
  Settings,
  History,
  Bookmark,
  Users,
  Flame,
  HelpCircle,
  Dices,
  Sparkles,
  Download,
  Trophy,
  ListOrdered,
  Share2,
  User,
  LogIn,
  LogOut,
  CheckCircle,
  X,
  RefreshCw,
} from 'lucide-react';

const STORAGE_KEY_SAVED_WHEELS = 'spinpick_saved_wheels_v1';
const STORAGE_KEY_HISTORY = 'spinpick_history_v1';
const STORAGE_KEY_CURRENT_WHEEL = 'spinpick_current_wheel_v1';

export default function App() {
  // Initial default wheel
  const initialPreset = PRESET_WHEELS[0];

  const [items, setItems] = useState<WheelItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_WHEEL);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          return parsed.items;
        }
      }
    } catch {}
    return initialPreset.items;
  });

  const [themeId, setThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_WHEEL);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.themeId) return parsed.themeId;
      }
    } catch {}
    return initialPreset.themeId || 'cyber-neon';
  });

  const [config, setConfig] = useState<WheelConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_WHEEL);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.config) {
          return {
            spinDuration: parsed.config.spinDuration || 5,
            spinSpeed: parsed.config.spinSpeed || 'normal',
            pointerPosition: parsed.config.pointerPosition || 'top',
            fontFamily: parsed.config.fontFamily || 'Outfit',
            fontSizeMultiplier: parsed.config.fontSizeMultiplier ?? 1.0,
            textTransform: parsed.config.textTransform || 'none',
            enableSound: parsed.config.enableSound !== false,
            soundVolume: parsed.config.soundVolume ?? 0.7,
            enableConfetti: parsed.config.enableConfetti !== false,
            confettiIntensity: parsed.config.confettiIntensity || 'normal',
            confettiDuration: parsed.config.confettiDuration || 3,
            mysteryMode: Boolean(parsed.config.mysteryMode),
            eliminationMode: Boolean(parsed.config.eliminationMode),
            winningAnimation: parsed.config.winningAnimation || 'confetti',
            title: parsed.config.title || initialPreset.title,
            centerText: parsed.config.centerText || initialPreset.config.centerText,
          };
        }
      }
    } catch {}
    return {
      spinDuration: 5,
      spinSpeed: 'normal',
      pointerPosition: 'top',
      fontFamily: 'Outfit',
      fontSizeMultiplier: 1.0,
      textTransform: 'none',
      enableSound: true,
      soundVolume: 0.7,
      enableConfetti: true,
      confettiIntensity: 'normal',
      confettiDuration: 3,
      mysteryMode: false,
      eliminationMode: false,
      winningAnimation: 'confetti',
      title: initialPreset.title,
      centerText: initialPreset.config.centerText || 'SPIN',
    };
  });

  const [mode, setMode] = useState<SpinMode>('classic');
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<WheelItem | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // User Auth State
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Modals & Drawers state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSavedWheelsModal, setShowSavedWheelsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showQuickFlipModal, setShowQuickFlipModal] = useState(false);
  const [showExporterModal, setShowExporterModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('spinpick_tour_seen'); } catch { return true; }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sharedBannerMessage, setSharedBannerMessage] = useState<string | null>(null);

  // Multi-winner pool state
  const [multiWinners, setMultiWinners] = useState<WheelItem[]>([]);

  // Saved wheels list
  const [savedWheels, setSavedWheels] = useState<SavedWheel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVED_WHEELS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Battle Royale initial contestants snapshot for revive/reset
  const [battleRoyaleSnapshot, setBattleRoyaleSnapshot] = useState<WheelItem[]>(() => items);

  // History list
  const [history, setHistory] = useState<SpinHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Auto-detect and import shared wheel from URL query string on startup
  useEffect(() => {
    const shared = decodeWheelFromUrl();
    if (shared && shared.items && shared.items.length > 0) {
      setItems(shared.items);
      if (shared.themeId) setThemeId(shared.themeId);
      setConfig((prev) => ({
        ...prev,
        title: shared.title,
        fontFamily: shared.fontFamily || prev.fontFamily,
      }));

      const authorText = shared.author ? ` by ${shared.author}` : '';
      setSharedBannerMessage(`🎡 Loaded shared wheel: "${shared.title}"${authorText}`);
      sound.playVictoryFanfare();
    }
  }, []);

  // Save current wheel to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_CURRENT_WHEEL,
        JSON.stringify({ items, themeId, config })
      );
    } catch {}
  }, [items, themeId, config]);

  // Save custom wheels to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_WHEELS, JSON.stringify(savedWheels));
    } catch {}
  }, [savedWheels]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {}
  }, [history]);

  const activeTheme = getTheme(themeId);
  const activeItems = items.filter((i) => i.enabled && i.weight > 0);
  const totalWeight = activeItems.reduce((sum, i) => sum + i.weight, 0);

  // Handle spin start
  const handleSpinStart = useCallback(() => {
    setIsSpinning(true);
    setCurrentWinner(null);
  }, []);

  // Handle spin completion
  const handleSpinEnd = useCallback(
    (winner: WheelItem) => {
      setIsSpinning(false);
      setCurrentWinner(winner);
      setShowWinnerModal(true);

      const isElimination = mode === 'elimination' || config.eliminationMode;
      if (isElimination) {
        if (activeItems.length <= 1) {
          sound.playVictoryFanfare();
        } else {
          sound.playElimination();
        }
      } else {
        sound.playVictoryFanfare();
      }

      // Record in history
      const newHistoryItem: SpinHistoryItem = {
        id: `history-${Date.now()}`,
        timestamp: Date.now(),
        winner,
        wheelTitle: config.title || 'Custom Wheel',
        mode,
        totalParticipants: activeItems.length,
      };
      setHistory((prev) => [newHistoryItem, ...prev].slice(0, 500));

      // If in multi-winner mode, accumulate winner
      if (mode === 'multi-winner') {
        setMultiWinners((prev) => [...prev, winner]);
      }
    },
    [config.title, config.eliminationMode, mode, activeItems.length]
  );

  // Trigger spin action from button or hotkey
  const handleTriggerSpin = useCallback(() => {
    const canvasId = isFullscreen ? 'fullscreen-wheel-canvas' : 'spin-wheel-canvas';
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (canvas && !isSpinning) {
      canvas.click();
    }
  }, [isSpinning, isFullscreen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Don't trigger spin/sound hotkeys when any modal is open
      const anyModalOpen = showWinnerModal || showAuthModal || showShareModal ||
        showSavedWheelsModal || showSettingsModal || showHistoryDrawer ||
        showTeamsModal || showQuickFlipModal || showExporterModal ||
        showTournamentModal;

      if (e.code === 'Space' && !anyModalOpen) {
        e.preventDefault();
        handleTriggerSpin();
      } else if ((e.key === 'm' || e.key === 'M') && !anyModalOpen) {
        e.preventDefault();
        setConfig((prev) => ({ ...prev, enableSound: !prev.enableSound }));
        sound.playPop(true);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerSpin, isFullscreen, showWinnerModal, showAuthModal, showShareModal, showSavedWheelsModal, showSettingsModal, showHistoryDrawer, showTeamsModal, showQuickFlipModal, showExporterModal, showTournamentModal]);

  // Item management handlers
  const handleAddItem = (item: Omit<WheelItem, 'id'>) => {
    const newItem: WheelItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    sound.playPop(false);
  };

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
    sound.playPop(true);
  };

  const handleUpdateItem = (id: string, updates: Partial<WheelItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleBulkAdd = (rawText: string) => {
    const lines = rawText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newItems: WheelItem[] = lines.map((line, idx) => {
      // Check if line begins with emoji
      let icon: string | undefined;
      let text = line;
      const emojiMatch = line.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
      if (emojiMatch) {
        icon = emojiMatch[0];
        text = line.replace(icon, '').trim();
      }

      const colorIndex = (items.length + idx) % activeTheme.sliceColors.length;
      return {
        id: `bulk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        text: text || line,
        color: activeTheme.sliceColors[colorIndex],
        weight: 1,
        enabled: true,
        icon,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveWinnerFromWheel = (winner: WheelItem) => {
    setItems((prev) => prev.filter((i) => i.id !== winner.id));
    sound.playPop(false);
  };

  // Restore all contestants in Battle Royale
  const handleRestoreBattleRoyale = () => {
    if (battleRoyaleSnapshot.length > 0) {
      setItems(battleRoyaleSnapshot.map((item) => ({ ...item, enabled: true })));
    } else {
      setItems((prev) => prev.map((item) => ({ ...item, enabled: true })));
    }
    sound.playVictoryFanfare();
  };

  // Load a wheel from presets or saved
  const handleLoadWheel = (wheel: SavedWheel) => {
    setItems(wheel.items);
    setBattleRoyaleSnapshot(wheel.items);
    if (wheel.themeId) setThemeId(wheel.themeId);
    if (wheel.config) {
      setConfig((prev) => ({
        ...prev,
        ...wheel.config,
        title: wheel.title,
      }));
    }
  };

  // Save current wheel to custom list
  const handleSaveCurrentWheel = (title: string, description?: string) => {
    const newSaved: SavedWheel = {
      id: `saved-${Date.now()}`,
      title,
      description,
      category: 'custom',
      items,
      themeId,
      config,
      updatedAt: Date.now(),
    };
    setSavedWheels((prev) => [newSaved, ...prev]);
  };

  const handleDeleteSavedWheel = (id: string) => {
    setSavedWheels((prev) => prev.filter((w) => w.id !== id));
  };

  const handleImportWheel = (imported: SavedWheel) => {
    setSavedWheels((prev) => [imported, ...prev]);
    handleLoadWheel(imported);
  };

  // Switch modes
  const handleSelectMode = (newMode: SpinMode) => {
    setMode(newMode);
    if (newMode === 'elimination') {
      if (items.length > 0) {
        setBattleRoyaleSnapshot(items);
      }
      setConfig((prev) => ({ ...prev, eliminationMode: true }));
    } else {
      setConfig((prev) => ({ ...prev, eliminationMode: false }));
      if (newMode === 'teams') {
        setShowTeamsModal(true);
      } else if (newMode === 'quick-flip') {
        setShowQuickFlipModal(true);
      } else if (newMode === 'tournament') {
        setShowTournamentModal(true);
      } else if (newMode === 'multi-winner') {
        setMultiWinners([]);
      }
    }
    sound.playPop(true);
  };

  return (
    <div
      id="spinpick-root-app"
      className="min-h-screen flex flex-col bg-[#020205] text-slate-200 selection:bg-indigo-500 font-sans relative overflow-x-hidden"
    >
      {/* Immersive Ambient Glow Orbs in Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-purple-900/20 rounded-full blur-[140px] animate-ambient-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/15 rounded-full blur-[160px] animate-ambient-pulse" />
        <div className="absolute top-[35%] right-[25%] w-[30%] h-[30%] bg-indigo-950/20 rounded-full blur-[150px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-white/5 bg-black/20 backdrop-blur-md px-4 sm:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin-slow" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-['Outfit']">
                SPINPICK<span className="text-indigo-400">PRO</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Decision Studio
              </span>
            </div>
          </div>

          {/* Mode Selector Pill Group */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/10 text-xs font-medium">
            <button
              id="mode-classic-btn"
              onClick={() => handleSelectMode('classic')}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                mode === 'classic'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎯 Classic
            </button>
            <button
              id="mode-elimination-btn"
              onClick={() => handleSelectMode('elimination')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                mode === 'elimination'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Battle Royale</span>
            </button>
            <button
              id="mode-teams-btn"
              onClick={() => handleSelectMode('teams')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                mode === 'teams'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Teams</span>
            </button>
            <button
              id="mode-flip-btn"
              onClick={() => handleSelectMode('quick-flip')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                mode === 'quick-flip'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Coin / Dice</span>
            </button>
            <button
              id="mode-tournament-btn"
              onClick={() => handleSelectMode('tournament')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                mode === 'tournament'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Tournament</span>
            </button>
          </div>

          {/* Action Bar / Modal Triggers */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="open-share-btn"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-full text-xs font-semibold text-indigo-300 hover:text-white transition-all shadow-sm"
              title="Share this Wheel with a link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              id="open-presets-btn"
              onClick={() => setShowSavedWheelsModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-medium text-slate-300 hover:text-white transition-all"
              title="Presets & Saved Wheels"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Templates</span>
            </button>

            <button
              id="open-export-btn"
              onClick={() => setShowExporterModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-medium text-slate-300 hover:text-white transition-all"
              title="Export Wheel (PNG/CSV/JSON)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              id="open-history-btn"
              onClick={() => setShowHistoryDrawer(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-medium text-slate-300 hover:text-white transition-all"
              title="Spin History & Analytics"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">History ({history.length})</span>
            </button>

            <button
              id="open-settings-btn"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-300 hover:text-white transition-all"
              title="Wheel Customization & Themes"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              id="toggle-sound-btn"
              onClick={() => {
                setConfig((prev) => ({ ...prev, enableSound: !prev.enableSound }));
                sound.playPop(true);
              }}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-300 hover:text-white transition-all"
              title={config.enableSound ? 'Sound: ON' : 'Sound: MUTED'}
            >
              {config.enableSound ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* User Account Button & Dropdown */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    id="user-profile-menu-btn"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 rounded-full transition-all text-xs font-semibold text-white"
                  >
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {user.avatar}
                    </div>
                    <span className="hidden sm:inline max-w-[90px] truncate">{user.name}</span>
                  </button>

                  {showUserDropdown && (
                    <div
                      className="absolute right-0 top-10 z-50 w-52 p-2 bg-[#0c0c18] border border-white/15 rounded-xl shadow-2xl space-y-1 animate-scale-up text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-2 border-b border-white/10">
                        <div className="font-bold text-white truncate">{user.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      </div>

                      <button
                        onClick={() => {
                          setShowSavedWheelsModal(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                        <span>My Saved Wheels</span>
                      </button>

                      <button
                        onClick={() => {
                          authService.logout();
                          setUser(null);
                          setShowUserDropdown(false);
                          sound.playPop(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  id="open-auth-btn"
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>

            <button
              id="fullscreen-toggle-btn"
              onClick={() => setIsFullscreen(true)}
              className="p-2 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 rounded-full text-indigo-300 hover:text-white transition-all"
              title="Fullscreen Presentation Mode (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Mode Selector Bar */}
      <div className="md:hidden flex items-center justify-around bg-black/40 backdrop-blur-md border-b border-white/5 p-2 text-xs font-medium relative z-20">
        <button
          onClick={() => handleSelectMode('classic')}
          className={`px-3 py-1 rounded-full ${mode === 'classic' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
        >
          🎯 Classic
        </button>
        <button
          onClick={() => handleSelectMode('elimination')}
          className={`px-3 py-1 rounded-full ${mode === 'elimination' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
        >
          ⚔️ Battle Royale
        </button>
        <button
          onClick={() => handleSelectMode('teams')}
          className="px-3 py-1 rounded-full text-slate-400"
        >
          👥 Teams
        </button>
        <button
          onClick={() => handleSelectMode('quick-flip')}
          className="px-3 py-1 rounded-full text-slate-400"
        >
          🎲 Flip/Dice
        </button>
        <button
          onClick={() => handleSelectMode('tournament')}
          className={`px-3 py-1 rounded-full ${mode === 'tournament' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
        >
          🏆 Tournament
        </button>
      </div>

      {/* Shared Wheel Notification Banner */}
      {sharedBannerMessage && (
        <div className="w-full bg-indigo-600/20 border-b border-indigo-500/30 py-2.5 px-4 text-center text-xs font-semibold text-indigo-200 flex items-center justify-center gap-3 relative z-20 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{sharedBannerMessage}</span>
          <button
            onClick={() => setSharedBannerMessage(null)}
            className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Elimination / Battle Royale Mode Banner */}
      {(mode === 'elimination' || config.eliminationMode) && (
        <div className="w-full bg-gradient-to-r from-rose-950/40 via-red-900/30 to-orange-950/40 border-b border-rose-500/30 py-2.5 px-4 text-center text-xs font-medium text-rose-200 flex flex-wrap items-center justify-center gap-3 relative z-20 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>
              <strong>Battle Royale Arena:</strong> Each winning choice is eliminated until one champion remains!
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
              {activeItems.length} {activeItems.length === 1 ? 'survivor' : 'contestants alive'}
            </span>

            {items.length < battleRoyaleSnapshot.length && (
              <span className="px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-slate-400 text-[11px]">
                {battleRoyaleSnapshot.length - items.length} eliminated
              </span>
            )}

            <button
              onClick={handleRestoreBattleRoyale}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-all shadow-sm hover:shadow-rose-600/30"
              title="Restore and revive all eliminated contestants"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Revive All Contestants</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Column: Interactive SpinWheel & Primary Oracle Controls */}
        <section className="lg:col-span-7 flex flex-col items-center justify-center space-y-6">
          {/* Wheel Title & The Oracle Awaits Header */}
          <div className="text-center w-full space-y-1">
            <p className="text-indigo-400 text-xs font-semibold tracking-[0.25em] uppercase">
              The Oracle Awaits
            </p>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="DECIDE YOUR DESTINY"
              className="text-3xl sm:text-4xl font-black text-center text-white tracking-tight bg-transparent hover:bg-white/5 focus:bg-black/40 px-3 py-1 rounded-2xl border border-transparent focus:border-white/10 focus:outline-none transition-colors w-full font-['Outfit']"
            />
            <p className="text-xs text-slate-400">
              {activeItems.length} active choices • Click wheel or press Space to spin
            </p>
          </div>

          {/* Canvas Wheel Component with Ambient Glow */}
          <div className="w-full flex items-center justify-center py-2 relative">
            <div className="absolute inset-0 max-w-[500px] max-h-[500px] mx-auto bg-gradient-to-tr from-indigo-500/10 to-purple-600/10 rounded-full blur-[70px] animate-pulse pointer-events-none" />
            <SpinWheel
              items={items}
              theme={activeTheme}
              config={config}
              isSpinning={isSpinning}
              onSpinStart={handleSpinStart}
              onSpinEnd={handleSpinEnd}
              size={510}
            />
          </div>

          {/* Primary Spin Action Button & Hotkeys Guide */}
          <div className="w-full max-w-md space-y-3">
            <button
              id="main-spin-action-btn"
              onClick={handleTriggerSpin}
              disabled={isSpinning || activeItems.length === 0}
              className="w-full py-4 px-6 rounded-2xl bg-white text-black hover:bg-slate-100 font-black text-lg sm:text-xl shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer border-2 border-white/30"
            >
              {isSpinning ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin text-black" />
                  <span>SPINNING WHEEL...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <span>SPIN PICK</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 font-mono">
              <span>Shortcut: [Spacebar]</span>
              <span>Theme: {activeTheme.name}</span>
              <span>Duration: {config.spinDuration}s</span>
            </div>
          </div>

          {/* Metric Status Pill (Last Pick & Confidence stats) */}
          <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-6 backdrop-blur-md shadow-lg">
            <div className="text-left">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Last Pick</p>
              <p className="text-sm font-bold text-white truncate max-w-[150px]">
                {history.length > 0 ? (
                  <span className="flex items-center gap-1">
                    {history[0].winner.icon && <span>{history[0].winner.icon}</span>}
                    <span>{history[0].winner.text}</span>
                  </span>
                ) : (
                  'Ready to Spin'
                )}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Confidence</p>
              <p className="text-sm font-bold text-indigo-400 font-mono">
                {activeItems.length > 0
                  ? `${(100 / activeItems.length).toFixed(1)}%`
                  : '0.0%'}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Spins</p>
              <p className="text-sm font-bold text-emerald-400 font-mono">
                {history.length}
              </p>
            </div>
          </div>

          {/* Multi-Winner Tracker (if active) */}
          {multiWinners.length > 0 && (
            <div className="w-full max-w-md p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/5 shadow-xl space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Trophy className="w-4 h-4" />
                  <span>Winners Drawn ({multiWinners.length})</span>
                </span>
                <button
                  onClick={() => setMultiWinners([])}
                  className="text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  Reset Winners
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {multiWinners.map((winner, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white"
                  >
                    <span className="text-amber-400">#{idx + 1}</span>
                    <span>{winner.icon}</span>
                    <span>{winner.text}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Choices Editor & Item Configuration */}
        <section className="lg:col-span-5 h-full">
          <WheelEditor
            items={items}
            theme={activeTheme}
            onUpdateItems={setItems}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onToggleItem={handleToggleItem}
            onUpdateItem={handleUpdateItem}
            onBulkAdd={handleBulkAdd}
          />
        </section>
      </main>

      {/* How It Works Section (Lazy Loaded) */}
      <React.Suspense
        fallback={
          <div className="w-full max-w-4xl mx-auto py-16 px-4 text-center">
            <div className="h-8 w-48 bg-white/5 rounded-full mx-auto animate-pulse" />
          </div>
        }
      >
        <HowItWorks />
      </React.Suspense>

      {/* Immersive Theme Footer */}
      <footer className="h-12 border-t border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 text-[10px] uppercase tracking-[0.2em] text-slate-600 font-bold relative z-20 mt-auto">
        <span>Core Engine v4.2.0</span>
        <span className="hidden sm:inline">System Status: Optimal</span>
        <span>© 2026 SpinPick Intelligence</span>
      </footer>

      {/* Winner Celebration Modal */}
      <WinnerModal
        winner={currentWinner}
        isOpen={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        onSpinAgain={handleTriggerSpin}
        onRemoveWinner={handleRemoveWinnerFromWheel}
        onRestoreAll={handleRestoreBattleRoyale}
        mode={mode}
        totalActiveCount={activeItems.length}
        totalWeight={totalWeight}
        isEliminationMode={mode === 'elimination' || config.eliminationMode}
        enableConfetti={config.enableConfetti}
        confettiIntensity={config.confettiIntensity}
        confettiDuration={config.confettiDuration}
      />

      {/* Saved Wheels & Templates Modal */}
      <SavedWheelsModal
        isOpen={showSavedWheelsModal}
        onClose={() => setShowSavedWheelsModal(false)}
        savedWheels={savedWheels}
        currentItems={items}
        currentConfig={config}
        currentThemeId={themeId}
        onLoadWheel={handleLoadWheel}
        onSaveCurrentWheel={handleSaveCurrentWheel}
        onDeleteSavedWheel={handleDeleteSavedWheel}
        onImportWheel={handleImportWheel}
      />

      {/* Wheel Settings Modal */}
      <WheelSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        config={config}
        currentThemeId={themeId}
        onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
        onSelectTheme={setThemeId}
      />

      {/* History & Statistics Drawer */}
      <HistoryStatsDrawer
        history={history}
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        onClearHistory={() => setHistory([])}
      />

      {/* Teams Generator Modal */}
      <TeamsGenerator
        items={items}
        isOpen={showTeamsModal}
        onClose={() => setShowTeamsModal(false)}
      />

      {/* Quick Flip & Dice Modal */}
      <QuickFlipModal
        isOpen={showQuickFlipModal}
        onClose={() => setShowQuickFlipModal(false)}
      />

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
        }}
      />

      {/* Share Wheel Link & Social Modal */}
      <ShareWheelModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={config.title || 'Spin Wheel'}
        items={items}
        config={config}
        themeId={themeId}
        user={user}
      />

      {/* Export Wheel Modal */}
      <ExporterModal
        isOpen={showExporterModal}
        onClose={() => setShowExporterModal(false)}
        items={items}
        config={config}
      />

      {/* Tournament Bracket Modal */}
      <TournamentMode
        items={items}
        isOpen={showTournamentModal}
        onClose={() => setShowTournamentModal(false)}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          try { localStorage.setItem('spinpick_tour_seen', '1'); } catch {}
        }}
      />

      {/* Hotkey Shortcuts Guide Overlay */}
      <HotkeyGuide />

      {/* Fullscreen Presentation Mode Stage */}
      {isFullscreen && (
        <FullscreenStage
          items={items}
          theme={activeTheme}
          config={config}
          isSpinning={isSpinning}
          onSpinStart={handleSpinStart}
          onSpinEnd={handleSpinEnd}
          onExitFullscreen={() => setIsFullscreen(false)}
          onToggleSound={() => {
            setConfig((prev) => ({ ...prev, enableSound: !prev.enableSound }));
            sound.playPop(true);
          }}
          onTriggerSpin={handleTriggerSpin}
        />
      )}
    </div>
  );
}
