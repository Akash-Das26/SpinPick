import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const SoundContext = createContext(null);

// Module-level AudioContext singleton with ref counting.
// Each mounted SoundProvider registers a reference; when the last one
// unmounts we close the context so long-lived SPA sessions don't leak it.
let audioContextSingleton = null;
let audioContextRefs = 0;

function getAudioContextSingleton() {
  if (audioContextSingleton) return audioContextSingleton;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContextSingleton = new AudioContext();
  if (audioContextSingleton.state === 'suspended') {
    audioContextSingleton.resume();
  }
  return audioContextSingleton;
}

function acquireAudioContext() {
  audioContextRefs += 1;
  return getAudioContextSingleton();
}

function releaseAudioContext() {
  audioContextRefs = Math.max(0, audioContextRefs - 1);
  if (audioContextRefs === 0 && audioContextSingleton) {
    const ctx = audioContextSingleton;
    audioContextSingleton = null;
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {
        // Ignore close errors (e.g. context already closed elsewhere)
      });
    }
  }
}

export function SoundProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef(null);
  const initializedRef = useRef(false);

  // Acquire a singleton reference on mount, release on unmount
  useEffect(() => {
    audioCtxRef.current = acquireAudioContext();
    return () => {
      audioCtxRef.current = null;
      releaseAudioContext();
    };
  }, []);

  // Handle autoplay policy: defer AudioContext creation until first user interaction
  useEffect(() => {
    if (initializedRef.current) return;
    
    const resumeAudio = async () => {
      const ctx = getAudioContextSingleton();
      if (ctx && ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // Ignore resume errors
        }
      }
      initializedRef.current = true;
      // Remove listeners after first interaction
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
      document.removeEventListener('touchstart', resumeAudio);
    };
    
    document.addEventListener('click', resumeAudio, { once: true, passive: true });
    document.addEventListener('keydown', resumeAudio, { once: true, passive: true });
    document.addEventListener('touchstart', resumeAudio, { once: true, passive: true });
    
    return () => {
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
      document.removeEventListener('touchstart', resumeAudio);
    };
  }, []);

  // Cleanup on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (audioContextSingleton && audioContextSingleton.state !== 'closed') {
        audioContextSingleton.close();
        audioContextSingleton = null;
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = getAudioContextSingleton();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTick = useCallback((velocity = 1) => {
    if (!soundEnabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const freq = 600 + Math.min(velocity * 80, 800);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {
      // Ignore audio context errors
    }
  }, [soundEnabled, getCtx]);

  const playVictory = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
      // Arpeggiated C Major 9 chord: C4, E4, G4, B4, D5
      const notes = [261.63, 329.63, 392.00, 493.88, 587.33];

      notes.forEach((freq, idx) => {
        const startTime = ctx.currentTime + (idx * 0.08);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.25);
      });
    } catch {
      // Ignore audio errors
    }
  }, [soundEnabled, getCtx]);

  const toggleSound = useCallback((override) => {
    const newState = override !== undefined ? override : !soundEnabled;
    setSoundEnabled(newState);
    return newState;
  }, [soundEnabled]);

  const value = {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    playTick,
    playVictory,
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components — named hook, not a component
export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}