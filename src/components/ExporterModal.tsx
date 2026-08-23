import React, { useRef } from 'react';
import { WheelItem, WheelConfig } from '../types';
import { Download, Image, FileText, FileJson, X } from 'lucide-react';

interface ExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WheelItem[];
  config: WheelConfig;
}

export const ExporterModal: React.FC<ExporterModalProps> = ({
  isOpen,
  onClose,
  items,
  config,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    const rows = [
      ['Label', 'Color', 'Weight', 'Enabled', 'Note'],
      ...items.map((item) => [
        `"${item.text.replace(/"/g, '""')}"`,
        item.color,
        String(item.weight),
        item.enabled ? 'Yes' : 'No',
        `"${(item.note || '').replace(/"/g, '""')}"`,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    downloadFile(csv, `spinpick_wheel_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const payload = {
      version: 1,
      title: config.title,
      items,
      exportedAt: Date.now(),
    };
    const json = JSON.stringify(payload, null, 2);
    downloadFile(json, `spinpick_wheel_${Date.now()}.json`, 'application/json');
  };

  const handleExportPNG = () => {
    // Capture the spin wheel canvas if available
    const canvas = document.getElementById('spin-wheel-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `spinpick_wheel_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else {
      // Fallback: create a simple visual export
      const offscreen = document.createElement('canvas');
      offscreen.width = 600;
      offscreen.height = 600;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      const cx = 300;
      const cy = 300;
      const radius = 250;
      const activeItems = items.filter((i) => i.enabled);
      const totalWeight = activeItems.reduce((sum, i) => sum + i.weight, 0);

      // Draw background
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, 600, 600);

      // Draw slices
      let startAngle = -Math.PI / 2;
      activeItems.forEach((item) => {
        const sliceAngle = (item.weight / totalWeight) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw label
        const midAngle = startAngle + sliceAngle / 2;
        const labelX = cx + Math.cos(midAngle) * radius * 0.6;
        const labelY = cy + Math.sin(midAngle) * radius * 0.6;
        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.rotate(midAngle);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.text.slice(0, 15), 0, 0);
        ctx.restore();

        startAngle += sliceAngle;
      });

      // Center hub
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Title
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(config.title || 'SpinPick', cx, cy + 5);

      const link = document.createElement('a');
      link.download = `spinpick_wheel_${Date.now()}.png`;
      link.href = offscreen.toDataURL('image/png');
      link.click();
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeItems = items.filter((i) => i.enabled);
  const totalWeight = activeItems.reduce((sum, i) => sum + i.weight, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#080810]/95 border border-white/10 p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-400" />
            <span>Export Wheel</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{activeItems.length} active slices</span>
          <span>•</span>
          <span>{totalWeight} total weight</span>
          <span>•</span>
          <span>{config.title || 'Untitled'}</span>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <button
            onClick={handleExportPNG}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center group-hover:bg-indigo-600/30 transition-colors">
              <Image className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Export as PNG</p>
              <p className="text-xs text-slate-400">Download wheel image for sharing</p>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-600/30 transition-colors">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Export as CSV</p>
              <p className="text-xs text-slate-400">Spreadsheet with all slice data</p>
            </div>
          </button>

          <button
            onClick={handleExportJSON}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-600/30 transition-colors">
              <FileJson className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Export as JSON</p>
              <p className="text-xs text-slate-400">Full wheel config for backup/import</p>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors border border-white/5"
        >
          Close
        </button>
      </div>
    </div>
  );
};
