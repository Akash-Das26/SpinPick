import React, { useRef, useEffect, useCallback } from 'react';
import { WheelItem, WheelTheme, PointerPosition, WheelConfig } from '../types';
import { sound } from '../utils/audio';
import { secureRandomInt } from '../utils/random';

interface SpinWheelProps {
  items: WheelItem[];
  theme: WheelTheme;
  config: WheelConfig;
  isSpinning: boolean;
  onSpinStart: () => void;
  onSpinEnd: (winner: WheelItem) => void;
  size?: number;
  canvasId?: string;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  items,
  theme,
  config,
  isSpinning,
  onSpinStart,
  onSpinEnd,
  size = 520,
  canvasId = 'spin-wheel-canvas',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Active items (enabled with weight > 0)
  const activeItems = items.filter((item) => item.enabled && item.weight > 0);
  const totalWeight = activeItems.reduce((sum, item) => sum + item.weight, 0);

  // Wheel state refs to avoid closure re-renders in animation loop
  const rotationRef = useRef<number>(0); // Current rotation in radians
  const isAnimatingRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);
  const targetRotationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(5000);
  const startRotationRef = useRef<number>(0);
  const lastSectorIdxRef = useRef<number>(-1);
  const needleDeflectionRef = useRef<number>(0);

  // Ref to latest drawing function — avoids self-reference and stale closures
  const drawCanvasRef = useRef<() => void>(() => {});

  // Preload segment images and trigger redraw via ref (no stale closure)
  useEffect(() => {
    const loaded = imageCacheRef.current;
    activeItems.forEach((item) => {
      if (item.imageUrl && !loaded.has(item.imageUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = item.imageUrl;
        img.onload = () => {
          loaded.set(item.imageUrl!, img);
          drawCanvasRef.current();
        };
      }
    });
  }, [activeItems]);

  // Calculate sector angles (startAngle, endAngle) for all active items
  const getSectorAngles = useCallback(() => {
    if (activeItems.length === 0 || totalWeight === 0) return [];
    let currentAngle = 0;
    return activeItems.map((item) => {
      const sliceAngle = (item.weight / totalWeight) * (Math.PI * 2);
      const start = currentAngle;
      const end = currentAngle + sliceAngle;
      currentAngle = end;
      return { item, startAngle: start, endAngle: end, sliceAngle };
    });
  }, [activeItems, totalWeight]);

  // Determine pointer angle offset based on configured pointer position
  const getPointerAngle = useCallback((pos: PointerPosition): number => {
    switch (pos) {
      case 'top':
        return 1.5 * Math.PI; // 270 deg (top)
      case 'right':
        return 0; // 0 deg (right)
      case 'bottom':
        return 0.5 * Math.PI; // 90 deg (bottom)
      case 'left':
        return Math.PI; // 180 deg (left)
      default:
        return 1.5 * Math.PI;
    }
  }, []);

  // Determine winner given current wheel rotation
  const getWinnerAtRotation = useCallback(
    (rot: number): WheelItem | null => {
      const sectors = getSectorAngles();
      if (sectors.length === 0) return null;

      const pointerAngle = getPointerAngle(config.pointerPosition);
      // Normalized angle pointing to pointer
      let relativeAngle = (pointerAngle - (rot % (Math.PI * 2))) % (Math.PI * 2);
      if (relativeAngle < 0) relativeAngle += Math.PI * 2;

      for (const sector of sectors) {
        if (relativeAngle >= sector.startAngle && relativeAngle < sector.endAngle) {
          return sector.item;
        }
      }
      return sectors[sectors.length - 1]?.item || null;
    },
    [getSectorAngles, getPointerAngle, config.pointerPosition]
  );

  // Draw the entire wheel on canvas (stable callback via ref, no self-reference)
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 26; // margin for rim & pegs

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (activeItems.length === 0) {
      // Empty state
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add at least one choice to spin!', centerX, centerY);
      ctx.restore();
      return;
    }

    const sectors = getSectorAngles();
    const rot = rotationRef.current;

    // Draw outer glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
    ctx.shadowColor = theme.glowColor;
    ctx.shadowBlur = isSpinning ? 28 : 14;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    ctx.restore();

    // Rotate context for slices
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rot);

    // Draw slices
    sectors.forEach((sector, idx) => {
      const { startAngle, endAngle, item } = sector;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Base color with custom or theme fallback
      const baseColor = item.color || theme.sliceColors[idx % theme.sliceColors.length];
      ctx.fillStyle = baseColor;
      ctx.fill();

      // Subtle 3D radial depth gradient
      const depthGrad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
      depthGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      depthGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      depthGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = depthGrad;
      ctx.fill();

      // Slice divider border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Slice Segment Content (Text + Image + Icon)
      ctx.save();
      const midAngle = startAngle + (endAngle - startAngle) / 2;
      ctx.rotate(midAngle);

      // Check if image is available and loaded for this segment
      const cachedImg = item.imageUrl ? imageCacheRef.current.get(item.imageUrl) : null;

      // Draw custom uploaded image badge if present
      if (cachedImg && !config.mysteryMode) {
        ctx.save();
        const imgSize = Math.min(46, Math.max(22, radius * 0.18));
        const imgX = radius * 0.74; // Position near outer arc
        const imgY = 0;

        // Circular clipping badge with border & shadow
        ctx.beginPath();
        ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 6;
        ctx.fill();

        ctx.save();
        ctx.clip();
        ctx.drawImage(
          cachedImg,
          imgX - imgSize / 2,
          imgY - imgSize / 2,
          imgSize,
          imgSize
        );
        ctx.restore();

        // Border ring around image badge
        ctx.beginPath();
        ctx.arc(imgX, imgY, imgSize / 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Draw Slice Text / Emoji
      let label = config.mysteryMode ? '❓' : item.text;
      if (config.textTransform === 'uppercase') {
        label = label.toUpperCase();
      } else if (config.textTransform === 'capitalize') {
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }

      const displayLabel = item.icon && !config.mysteryMode ? `${item.icon} ${label}` : label;

      ctx.fillStyle = theme.textColor || '#ffffff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Font style calculation with user selected font family & multiplier
      const fontFamily = config.fontFamily || 'Outfit';
      const fontMult = config.fontSizeMultiplier || 1.0;
      const sliceAngleDeg = ((endAngle - startAngle) * 180) / Math.PI;

      let baseFontSize = Math.min(18, Math.max(11, Math.floor(sliceAngleDeg * 0.75)));
      if (activeItems.length > 16) baseFontSize = Math.max(9, baseFontSize - 2);
      const finalFontSize = Math.round(baseFontSize * fontMult);

      ctx.font = `700 ${finalFontSize}px '${fontFamily}', sans-serif`;

      // Text shadow for high contrast legibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Available text space (leaves room if image badge is present)
      const maxTextWidth = cachedImg && !config.mysteryMode ? radius * 0.44 : radius * 0.58;
      let trimmed = displayLabel;

      if (ctx.measureText(trimmed).width > maxTextWidth) {
        while (trimmed.length > 3 && ctx.measureText(trimmed + '…').width > maxTextWidth) {
          trimmed = trimmed.slice(0, -1);
        }
        trimmed += '…';
      }

      const textDistance = cachedImg && !config.mysteryMode ? radius * 0.48 : radius * 0.32;
      ctx.fillText(trimmed, textDistance, 0);

      ctx.restore();
    });

    // Draw Sector Pegs around the outer rim of the rotating wheel
    sectors.forEach((sector) => {
      const pegX = Math.cos(sector.startAngle) * (radius + 2);
      const pegY = Math.sin(sector.startAngle) * (radius + 2);
      ctx.beginPath();
      ctx.arc(pegX, pegY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.fill();
    });

    ctx.restore(); // end rotating context

    // Draw Outer Rim (Static frame with metallic rivets)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = theme.rimColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = theme.rimBorder;
    ctx.stroke();

    // Rim decorative LED dots
    const numLeds = 24;
    for (let i = 0; i < numLeds; i++) {
      const ledAngle = (i / numLeds) * Math.PI * 2;
      const ledX = centerX + Math.cos(ledAngle) * (radius + 8);
      const ledY = centerY + Math.sin(ledAngle) * (radius + 8);
      ctx.beginPath();
      ctx.arc(ledX, ledY, 2.5, 0, Math.PI * 2);
      const isLit = isSpinning ? (i + Math.floor(Date.now() / 120)) % 2 === 0 : true;
      ctx.fillStyle = isLit ? theme.rimBorder : 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
    ctx.restore();

    // Draw Center Hub (Button-like)
    ctx.save();
    const hubRadius = radius * 0.22;

    // Hub Outer Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = theme.hubBorder;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fill();

    // Hub Inner Core
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2);
    ctx.fillStyle = theme.hubColor;
    ctx.fill();

    // Hub Bevel Gradient
    const hubGrad = ctx.createLinearGradient(centerX - hubRadius, centerY - hubRadius, centerX + hubRadius, centerY + hubRadius);
    hubGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    hubGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    hubGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = hubGrad;
    ctx.fill();

    // Hub Center Text / Logo
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 13px '${config.fontFamily || 'Outfit'}', sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;

    const hubText = config.centerText || (isSpinning ? '...' : 'SPIN');
    ctx.fillText(hubText, centerX, centerY);
    ctx.restore();

    // Draw Pointer Needle with deflection physics
    ctx.save();
    const pointerAngle = getPointerAngle(config.pointerPosition);
    const needleDist = radius + 12;
    const needleBaseX = centerX + Math.cos(pointerAngle) * needleDist;
    const needleBaseY = centerY + Math.sin(pointerAngle) * needleDist;

    // Apply needle deflection angle
    const deflection = needleDeflectionRef.current;
    const currentNeedleAngle = pointerAngle + Math.PI + deflection;

    ctx.translate(needleBaseX, needleBaseY);
    ctx.rotate(currentNeedleAngle);

    // Pointer shape (triangle arrow with bevel)
    ctx.beginPath();
    ctx.moveTo(34, 0); // Tip pointing towards center of wheel
    ctx.lineTo(0, -13);
    ctx.lineTo(-6, -8);
    ctx.lineTo(-6, 8);
    ctx.lineTo(0, 13);
    ctx.closePath();

    ctx.fillStyle = theme.needleColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.strokeStyle = theme.needleAccent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer pivot pin
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    ctx.restore();
  }, [activeItems, theme, config, isSpinning, getSectorAngles, getPointerAngle]);

  // Keep drawCanvasRef in sync for image preload & animation loop
  useEffect(() => {
    drawCanvasRef.current = () => drawWheel();
  }, [drawWheel]);

  // Resize canvas according to container and DPR
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const displaySize = Math.min(rect.width, size);

    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    drawWheel();
  }, [drawWheel, size]);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [handleResize]);

  // Trigger spin animation
  const spinWheel = useCallback(() => {
    if (isSpinning || isAnimatingRef.current || activeItems.length === 0) return;

    sound.unlock();
    onSpinStart();

    // Speed multiplier configuration
    const speedMultipliers = {
      slow: 0.7,
      normal: 1.0,
      fast: 1.5,
      hyper: 2.2,
    };
    const speed = speedMultipliers[config.spinSpeed || 'normal'];
    const duration = (config.spinDuration || 5) * 1000;

    // Pick random target angle with extra full rotations (e.g. 6 to 12 rotations)
    const baseRotations = 6 + (secureRandomInt(100000) / 100000) * 6 * speed;
    const randomAngle = (secureRandomInt(100000) / 100000) * Math.PI * 2;
    const totalDelta = baseRotations * Math.PI * 2 + randomAngle;

    startRotationRef.current = rotationRef.current % (Math.PI * 2);
    targetRotationRef.current = startRotationRef.current + totalDelta;
    startTimeRef.current = performance.now();
    durationRef.current = duration;
    isAnimatingRef.current = true;
    lastSectorIdxRef.current = -1;

    sound.playSpinStart();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / durationRef.current);

      // Quintic ease out for hyper-realistic deceleration: 1 - (1 - t)^5
      const easeOut = 1 - Math.pow(1 - progress, 4.5);
      const currentRot = startRotationRef.current + (targetRotationRef.current - startRotationRef.current) * easeOut;
      rotationRef.current = currentRot;

      // Check sector passing for tick sound & needle bounce
      const sectors = getSectorAngles();
      if (sectors.length > 0) {
        const pointerAngle = getPointerAngle(config.pointerPosition);
        let relAngle = (pointerAngle - (currentRot % (Math.PI * 2))) % (Math.PI * 2);
        if (relAngle < 0) relAngle += Math.PI * 2;

        let currentSectorIdx = -1;
        for (let i = 0; i < sectors.length; i++) {
          if (relAngle >= sectors[i].startAngle && relAngle < sectors[i].endAngle) {
            currentSectorIdx = i;
            break;
          }
        }

        if (currentSectorIdx !== -1 && currentSectorIdx !== lastSectorIdxRef.current) {
          lastSectorIdxRef.current = currentSectorIdx;
          // Velocity-dependent tick pitch
          const remainingVelocity = 1 - progress;
          sound.playTick(0.8 + remainingVelocity * 0.4);

          // Deflect needle dynamically
          needleDeflectionRef.current = 0.25 * remainingVelocity;
        }
      }

      // Spring-decay needle deflection back to zero
      needleDeflectionRef.current *= 0.84;

      drawCanvasRef.current();

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        needleDeflectionRef.current = 0;
        drawCanvasRef.current();

        // Determine final winner
        const winner = getWinnerAtRotation(rotationRef.current);
        if (winner) {
          sound.playVictoryFanfare();
          onSpinEnd(winner);
        }
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
  }, [
    isSpinning,
    activeItems,
    config,
    onSpinStart,
    onSpinEnd,
    getSectorAngles,
    getPointerAngle,
    getWinnerAtRotation,
  ]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Update volume & mute in sound engine
  useEffect(() => {
    sound.setMuted(!config.enableSound);
    sound.setVolume(config.soundVolume ?? 0.7);
  }, [config.enableSound, config.soundVolume]);

  // Redraw when items, theme, or config changes
  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Screen reader announcement for spin result
  const announcement = isSpinning
    ? 'Spinning the wheel...'
    : activeItems.length > 0
      ? `Wheel ready with ${activeItems.length} options. Click or press Spacebar to spin.`
      : 'Wheel is empty. Add options to spin.';

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center p-2 select-none"
      style={{ maxWidth: `${size}px`, width: '100%' }}
    >
      {/* Screen reader live region for spin announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <canvas
        id={canvasId}
        ref={canvasRef}
        onClick={spinWheel}
        role="img"
        aria-label={`Spin wheel with ${activeItems.length} options: ${activeItems.map((i) => i.text).join(', ')}`}
        className={`cursor-pointer transition-transform duration-200 active:scale-[0.99] touch-none drop-shadow-2xl rounded-full ${
          isSpinning ? 'cursor-wait' : 'hover:scale-[1.01]'
        }`}
        title={isSpinning ? 'Spinning...' : 'Click or press Spacebar to spin!'}
      />
    </div>
  );
};

