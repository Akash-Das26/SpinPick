import { useCallback, useEffect } from 'react';

const DEFAULT_FOCUSABLE_SELECTOR = 'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useModalA11y({
  isOpen,
  modalRef,
  onClose,
  focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
  focusDelay = 50,
  watch = []
}) {
  const getFocusable = useCallback(() => {
    if (!modalRef?.current) return [];
    return Array.from(modalRef.current.querySelectorAll(focusableSelector)).filter(
      (el) => !el.disabled && el.offsetParent !== null
    );
  }, [modalRef, focusableSelector]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timer = setTimeout(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) focusable[0].focus();
    }, focusDelay);

    return () => clearTimeout(timer);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- dynamic watch list by design
  }, [isOpen, getFocusable, focusDelay, ...watch]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- dynamic watch list by design
  }, [isOpen, getFocusable, onClose, ...watch]);
}
