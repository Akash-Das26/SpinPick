import React, { useRef, useEffect, useCallback, useState } from 'react';
import { RotateCcw, Edit3, SlidersHorizontal, Download } from '../lib/icons';
import { useSound } from '../hooks/useSound';
import styles from './WheelStage.module.css';

// Cryptographically secure random float in [0, 1)
function secureRandom() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] / (0xFFFFFFFF + 1);
}

// Calculate optimal font size based on slice angle and label length
function calculateFontSize(sliceCount, labelLength, sliceAngle) {
  const baseSize = sliceCount > 8 ? 7 : 8.5;
  const lengthFactor = Math.max(0.6, 1 - (labelLength - 12) * 0.04);
  const angleFactor = Math.max(0.5, sliceAngle / 30);
  return Math.max(5, baseSize * lengthFactor * angleFactor);
}

// Truncate label to fit within slice with ellipsis
function truncateLabel(label, maxChars) {
  if (label.length <= maxChars) return label;
  return label.slice(0, maxChars - 1) + '…';
}

export function WheelStage({
  options = [],
  targetWinnerIndex = null,
  onSpinComplete,
  isSpinning,
  setIsSpinning,
  currentPrompt,
  onOpenSliceEditor,
  onOpenCriteriaTuner,
  onOpenExporter
}) {
  const { playTick, playVictory } = useSound();
  const rotationRef = useRef(0);
  const wheelElRef = useRef(null);
  const pointerElRef = useRef(null);
  const animRef = useRef(null);
  const lastSliceIndexRef = useRef(-1);
  const [confetti, setConfetti] = useState(null);
  const [spinSpeed, setSpinSpeed] = useState(3500); // Default 3.5 seconds

  // Dynamic import for confetti
  useEffect(() => {
    import('canvas-confetti').then(m => setConfetti(() => m.default));
  }, []);

  const applyRotation = useCallback((deg) => {
    if (wheelElRef.current) {
      wheelElRef.current.style.transform = `rotate(${deg}deg)`;
    }
  }, []);

  const totalWeight = options.reduce((sum, o) => sum + (o.weight || 1), 0);

  let currentAngle = 0;
  const slices = options.map((opt) => {
    const sliceAngle = ((opt.weight || 1) / totalWeight) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;
    currentAngle = endAngle;
    return { ...opt, startAngle, endAngle, midAngle, sliceAngle };
  });

  const startSpin = () => {
    if (isSpinning || slices.length === 0) return;
    setIsSpinning(true);

    let winnerIndex = targetWinnerIndex;
    if (winnerIndex === null || winnerIndex < 0 || winnerIndex >= slices.length) {
      const rand = secureRandom() * totalWeight;
      let cum = 0;
      for (let i = 0; i < slices.length; i++) {
        cum += slices[i].weight || 1;
        if (rand <= cum) { winnerIndex = i; break; }
      }
    }
    if (winnerIndex === undefined || winnerIndex === null) winnerIndex = 0;

    const winnerSlice = slices[winnerIndex];
    const jitter = (secureRandom() - 0.5) * (winnerSlice.sliceAngle * 0.7);
    const targetSliceMid = winnerSlice.midAngle + jitter;
    const deltaTarget = (360 - (targetSliceMid % 360)) % 360;

    const startRot = rotationRef.current % 360;
    const finalRot = rotationRef.current + (360 * 6) + (deltaTarget - startRot + 360) % 360;

    const startTime = performance.now();
    const duration = spinSpeed;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3.5);
      const currentRot = rotationRef.current + (finalRot - rotationRef.current) * easeOut;

      applyRotation(currentRot);

      const normalizedRot = (360 - (currentRot % 360)) % 360;
      const currentSliceIdx = slices.findIndex(
        (s) => normalizedRot >= s.startAngle && normalizedRot < s.endAngle
      );
      if (currentSliceIdx !== -1 && currentSliceIdx !== lastSliceIndexRef.current) {
        lastSliceIndexRef.current = currentSliceIdx;
        playTick(1 - progress);

        if (pointerElRef.current) {
          pointerElRef.current.classList.add('pointer-bounce');
          setTimeout(() => pointerElRef.current?.classList.remove('pointer-bounce'), 60);
        }
        
        // Announce current slice for screen readers
        const liveRegion = wheelElRef.current?.querySelector('[aria-live]');
        if (liveRegion) {
          liveRegion.textContent = `Passing ${slices[currentSliceIdx].label}`;
        }
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = finalRot;
        setIsSpinning(false);
        playVictory();

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReduced && confetti) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#d8ff5b', '#a3ff12', '#38ef7d', '#ffffff'],
          });
        }

        if (onSpinComplete) {
          onSpinComplete(winnerSlice, winnerIndex);
        }
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div className={`${styles.wheelStage} glass-panel wheel-stage`}>
      {/* Stage Header */}
      <div className={`${styles.wheelStage__header} wheel-stage__header`}>
        <div>
          <span className="mono wheel-stage__eyebrow wheel-stage__eyebrow">LIVE PHYSICS CANVAS</span>
          <h3 className="wheel-stage__title" title={currentPrompt || ''}>
            {currentPrompt ? `"${currentPrompt.length > 40 ? currentPrompt.slice(0, 40) + '…' : currentPrompt}"` : 'Interactive Decision Wheel'}
          </h3>
        </div>

        <div className="flex gap-6 flex-wrap wheel-stage__headerActions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenCriteriaTuner}
            disabled={isSpinning}
            aria-label="Tune AI multi-criteria weights"
            title="AI Criteria Weight Tuner"
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            AI Tuner
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenSliceEditor}
            disabled={isSpinning || options.length === 0}
            aria-label={`Edit wheel slices. Currently ${options.length} slices.`}
            title={options.length > 0 ? "Edit Slices & Weights" : "Generate options first"}
          >
            <Edit3 size={14} aria-hidden="true" />
            {options.length > 0 ? `Slices (${options.length})` : 'Slices'}
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenExporter}
            disabled={isSpinning}
            aria-label="Export wheel as PNG or CSV data"
            title="Export PNG/CSV/JSON Hub"
          >
            <Download size={14} aria-hidden="true" />
            Export
          </button>

          {/* Spin Speed Control */}
          <div className="flex items-center gap-6 px-4" style={{ minWidth: '180px' }}>
            <span className="mono text-xs text-muted" aria-hidden="true">Speed</span>
            <input
              type="range"
              min="1000"
              max="8000"
              step="500"
              value={spinSpeed}
              onChange={(e) => setSpinSpeed(parseInt(e.target.value))}
              disabled={isSpinning}
              aria-label="Spin animation speed"
              title={`Spin duration: ${spinSpeed}ms`}
              className="flex-1"
            />
            <span className="mono text-xs text-muted" style={{ minWidth: '45px' }}>
              {spinSpeed}ms
            </span>
          </div>
        </div>
      </div>

      {/* Wheel Container */}
      <div className="wheel-stage__canvas wheel-stage__canvas">
        {/* Glowing Top Pointer */}
        <div ref={pointerElRef} className={`${styles.wheelPointer} wheel-pointer ${lastSliceIndexRef.current !== -1 ? styles.pointerBounceClass : ''}`} aria-hidden="true">
          <div className="wheel-pointer__triangle" />
          <div className="wheel-pointer__dot" />
        </div>

        {/* SVG Wheel */}
        <div ref={wheelElRef} className={`${styles.wheelDisc} wheel-disc`}>
          <svg viewBox="-100 -100 200 200" aria-label="Decision spin wheel" role="img"
            className={`${styles.wheelSvg} wheel-svg`}>
            <title>Decision wheel with {slices.length} options</title>
            <desc>
              {slices.map(s => `${s.label} (${Math.round(s.sliceAngle)}°)`).join(', ')}
            </desc>
            {/* Live region for screen reader announcements during spin */}
            <text aria-live="polite" aria-atomic="true" className="sr-only" />
            {slices.map((slice) => {
              const startRad = (slice.startAngle * Math.PI) / 180;
              const endRad = (slice.endAngle * Math.PI) / 180;
              const r = 100;
              const x1 = Math.cos(startRad) * r, y1 = Math.sin(startRad) * r;
              const x2 = Math.cos(endRad) * r, y2 = Math.sin(endRad) * r;
              const largeArc = slice.sliceAngle > 180 ? 1 : 0;
              const d = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

              const midRad = (slice.midAngle * Math.PI) / 180;
              const textR = 64;
              const tx = Math.cos(midRad) * textR;
              const ty = Math.sin(midRad) * textR;

              const lightColors = ['#d8ff5b', '#a3ff12', '#38ef7d', '#00f2fe', '#ffb86c', '#ffd166'];
              const textFill = lightColors.some(c => slice.color.toLowerCase() === c.toLowerCase())
                ? '#07070d'
                : '#f2f2f8';

              // Calculate optimal font size and max chars for this slice
              const fontSize = calculateFontSize(slices.length, slice.label.length, slice.sliceAngle);
              const maxChars = Math.max(6, Math.floor(24 * (slice.sliceAngle / 45) * (8.5 / fontSize)));
              const displayLabel = truncateLabel(slice.label, maxChars);

              return (
                <g key={slice.id}>
                  <path d={d} fill={slice.color} stroke="#07070d" strokeWidth="1.5" />
                  <text
                    x={tx} y={ty}
                    fill={textFill}
                    fontSize={fontSize}
                    fontWeight="800"
                    fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${slice.midAngle} ${tx} ${ty})`}
                    title={slice.label}
                  >
                    {displayLabel}
                  </text>
                </g>
              );
            })}
            <circle r="14" fill="#07070d" stroke="var(--border-medium)" strokeWidth="2" />
            <circle r="6" fill="var(--accent-lime)" />
          </svg>
        </div>

        {/* Center SPIN Hub */}
        <div className="wheel-hub" aria-hidden="true">
          <button
            onClick={startSpin}
            disabled={isSpinning || options.length === 0}
            className={`${styles.wheelHub__btn} wheel-hub__btn ${isSpinning ? styles.wheelHub__btnSpinning : ''}`}
            aria-label={isSpinning ? 'Wheel is spinning' : 'Spin the wheel'}
          >
            {isSpinning ? 'SPIN...' : 'SPIN'}
          </button>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="wheel-stage__footer wheel-stage__footer">
        <span className="mono text-sm text-muted wheel-stage__status">
          {isSpinning ? '⚡ Decelerating physics...' : 'Ready to spin'}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={startSpin} disabled={isSpinning}
          aria-label="Spin the wheel again">
          <RotateCcw size={15} aria-hidden="true" />
          Spin Again
        </button>
      </div>
    </div>
  );
}
