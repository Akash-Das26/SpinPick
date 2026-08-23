import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_FOCUSABLE_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface UseModalA11yOptions {
  isOpen: boolean;
  onClose?: () => void;
  focusableSelector?: string;
  focusDelay?: number;
}

/**
 * Accessibility hook for modal components.
 * Handles:
 * - Auto-focus first focusable element on open
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - Escape key to close
 * - Returns a ref to attach to the modal container
 */
export function useModalA11y({
  isOpen,
  onClose,
  focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
  focusDelay = 50,
}: UseModalA11yOptions) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  const getFocusable = useCallback(() => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(focusableSelector)
    ).filter((el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null);
  }, [focusableSelector]);

  // Auto-focus first element on open
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, focusDelay);

    return () => clearTimeout(timer);
  }, [isOpen, getFocusable, focusDelay]);

  // Focus trap and Escape handler
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, getFocusable]);

  return modalRef;
}
