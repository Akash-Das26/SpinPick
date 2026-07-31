import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsOptions {
  onSpin?: () => void;
  onTour?: () => void;
  setActiveTab: (tab: string) => void;
  isSpinning: boolean;
}

export function useKeyboardShortcuts({ 
  onSpin, 
  onTour, 
  setActiveTab,
  isSpinning 
}: UseKeyboardShortcutsOptions) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    // Ignore if typing in input, textarea, or select
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
    // Ignore if a modal is open
    if (document.querySelector('[role="dialog"]')) return;
    
    if (e.code === 'Space' && !isSpinning) {
      e.preventDefault();
      onSpin?.();
    }
    if (e.code === 'KeyT') setActiveTab('tournament');
    if (e.code === 'KeyB') setActiveTab('builder');
    if (e.code === 'KeyH') setActiveTab('history');
    if (e.code === 'KeyD') setActiveTab('discover');
    if (e.code === 'KeyS') setActiveTab('studio');
    if (e.code === 'Slash' && e.shiftKey) onTour?.(); // Shift+? for help
  }, [onSpin, onTour, setActiveTab, isSpinning]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}