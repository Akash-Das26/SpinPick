import React, { useState, useRef } from 'react';
import { X, Download, FileSpreadsheet, FileCode, Image, Check } from '../lib/icons';
import Papa from 'papaparse';
import { useModalA11y } from '../hooks/useModalA11y';
import styles from './ExporterModal.module.css';

// roundRect polyfill for older browsers (Safari < 16.4, Firefox < 105, Chrome < 107)
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function ExporterModal({ isOpen, onClose, currentPrompt, options, setOptions, displayVerdict }) {
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [importMessage, setImportMessage] = useState(null);
  const modalRef = useRef(null);

  useModalA11y({ isOpen, modalRef, onClose });

  if (!isOpen) return null;

  // Render high-res wheel + verdict card to HTML5 canvas for crisp PNG export
  const handleExportPNG = () => {
    const canvas = document.createElement('canvas');
    const canvasWidth = 1200;
    const canvasHeight = 1200;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Background fill
    ctx.fillStyle = '#07070d';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Subtle radial background gradient
    const grad = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, 50, canvasWidth / 2, canvasHeight / 2, 600);
    grad.addColorStop(0, 'rgba(216, 255, 91, 0.08)');
    grad.addColorStop(1, 'rgba(7, 7, 13, 1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Title & Prompt Header
    ctx.fillStyle = '#d8ff5b';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SpinPick Decision Studio — High-Res Export', canvasWidth / 2, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Outfit", sans-serif';
    ctx.fillText(`"${currentPrompt || 'Decision Wheel'}"`, canvasWidth / 2, 140);

    // Draw SVG Wheel Slices
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2 - 20;
    const radius = 360;

    const totalWeight = options.reduce((sum, o) => sum + (o.weight || 1), 0);
    let currentAngle = -Math.PI / 2;

    options.forEach((opt) => {
      const sliceAngle = ((opt.weight || 1) / totalWeight) * (Math.PI * 2);
      const endAngle = currentAngle + sliceAngle;

      // Slice sector
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = opt.color || '#d8ff5b';
      ctx.fill();
      ctx.strokeStyle = '#07070d';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Slice label text
      const midAngle = currentAngle + (sliceAngle / 2);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(midAngle);
      ctx.textAlign = 'center';
      ctx.fillStyle = (opt.color === '#d8ff5b' || opt.color === '#a3ff12' || opt.color === '#38ef7d') ? '#07070d' : '#f2f2f8';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(opt.label.length > 18 ? opt.label.slice(0, 17) + '…' : opt.label, radius * 0.65, 8);
      ctx.restore();

      currentAngle = endAngle;
    });

    // Center Hub Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#07070d';
    ctx.fill();
    ctx.strokeStyle = '#262638';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#d8ff5b';
    ctx.fill();

    // Top Pointer Triangle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 15);
    ctx.lineTo(centerX - 24, centerY - radius - 55);
    ctx.lineTo(centerX + 24, centerY - radius - 55);
    ctx.closePath();
    ctx.fillStyle = '#d8ff5b';
    ctx.fill();

    // Bottom Verdict Banner if winner exists
    if (displayVerdict?.winner) {
      ctx.fillStyle = 'rgba(20, 20, 34, 0.95)';
      ctx.beginPath();
      roundRect(ctx, canvasWidth / 2 - 400, canvasHeight - 200, 800, 130, 18);
      ctx.fill();
      ctx.strokeStyle = '#d8ff5b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#d8ff5b';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 WINNING VERDICT', canvasWidth / 2, canvasHeight - 155);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Outfit", sans-serif';
      ctx.fillText(displayVerdict.winner.label, canvasWidth / 2, canvasHeight - 105);
    }

    // Trigger PNG Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `spinpick-${(currentPrompt || 'wheel').toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
    link.href = dataUrl;
    link.click();

    setDownloadSuccess('png');
    setTimeout(() => setDownloadSuccess(null), 2000);
  };

  // Export wheel as CSV file
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,Label,Description,Weight,Color\n';
    options.forEach(opt => {
      const row = `"${opt.label.replace(/"/g, '""')}","${(opt.desc || '').replace(/"/g, '""')}",${opt.weight || 1},"${opt.color || ''}"`;
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `spinpick-wheel-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('csv');
    setTimeout(() => setDownloadSuccess(null), 2000);
  };

  // Export wheel as JSON file
  const handleExportJSON = () => {
    const data = {
      title: currentPrompt || 'SpinPick Custom Wheel',
      exportedAt: new Date().toISOString(),
      options: options
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spinpick-wheel-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess('json');
    setTimeout(() => setDownloadSuccess(null), 2000);
  };

  // Import wheel from uploaded CSV or JSON file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (!text) return;

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.options)) {
            setOptions(parsed.options);
            setImportMessage({ type: 'success', text: `Loaded ${parsed.options.length} options from JSON!` });
            setTimeout(() => { setImportMessage(null); onClose(); }, 1200);
          }
        } else if (file.name.endsWith('.csv')) {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const imported = [];
              for (const row of results.data) {
                const label = (row.Label || row.label || '').trim();
                if (!label) continue;
                imported.push({
                  id: `imp-${Date.now()}-${imported.length}`,
                  label,
                  desc: (row.Description || row.description || '').trim(),
                  weight: parseInt(row.Weight || row.weight, 10) || 1,
                  color: (row.Color || row.color || '').trim() || '#d8ff5b'
                });
              }
              if (imported.length > 0) {
                setOptions(imported);
                setImportMessage({ type: 'success', text: `Loaded ${imported.length} options from CSV!` });
                setTimeout(() => { setImportMessage(null); onClose(); }, 1200);
              }
            }
          });
        }
      } catch {
        setImportMessage({ type: 'error', text: 'Could not parse file. Please upload a valid CSV or JSON export.' });
        setTimeout(() => setImportMessage(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exporter-modal-title"
      className={`${styles.overlay} grid-center`}
    >
      <div ref={modalRef} className={`glass-panel p-28 w-full ${styles.modal}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-20">
          <div>
            <span className="mono text-xs text-lime font-bold tracking-wider uppercase">
              100% FREE & ZERO WATERMARKS
            </span>
            <h3 id="exporter-modal-title" className="font-extrabold mt-2 text-lg">
              Export & Import Decision Hub
            </h3>
            <p className="text-sm text-muted mt-6">
              Share a snapshot, back up your wheel, or restore a saved setup from a file.
            </p>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close export modal">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* 4K Image Export Card */}
        <div className="bg-surface border-medium rounded-md mb-16 p-18">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-10">
              <Image size={20} color="var(--accent-lime)" aria-hidden="true" />
              <div>
                <h4 className={`font-extrabold ${styles.headingSmall}`}>High-Res PNG Image Snapshot</h4>
                <p className="text-sm text-muted">Crisp 1200x1200px graphics with an optional verdict banner</p>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleExportPNG}>
              {downloadSuccess === 'png' ? <Check size={15} /> : <Download size={15} />}
              {downloadSuccess === 'png' ? 'Exported!' : 'Export PNG'}
            </button>
          </div>
        </div>

        {/* Bulk Data Formats */}
        <div className={`${styles.bulkGrid} mb-20`}>
          <div className="bg-surface border-subtle rounded-md p-16">
            <FileSpreadsheet size={20} color="var(--accent-cyan)" className="mb-8" aria-hidden="true" />
            <h4 className={`font-extrabold ${styles.headingSmall}`}>CSV Spreadsheet</h4>
            <p className="text-xs text-muted mb-12">Export options as Excel/CSV table</p>
            <button className="btn btn-secondary btn-sm w-full" onClick={handleExportCSV}>
              {downloadSuccess === 'csv' ? <Check size={14} /> : <Download size={14} />}
              {downloadSuccess === 'csv' ? 'Downloaded!' : 'Export CSV'}
            </button>
          </div>

          <div className="bg-surface border-subtle rounded-md p-16">
            <FileCode size={20} color="var(--accent-purple)" className="mb-8" aria-hidden="true" />
            <h4 className={`font-extrabold ${styles.headingSmall}`}>JSON Backup File</h4>
            <p className="text-xs text-muted mb-12">Full structured wheel config</p>
            <button className="btn btn-secondary btn-sm w-full" onClick={handleExportJSON}>
              {downloadSuccess === 'json' ? <Check size={14} /> : <Download size={14} />}
              {downloadSuccess === 'json' ? 'Downloaded!' : 'Export JSON'}
            </button>
          </div>
        </div>

        {/* Import feedback */}
        {importMessage && (
          <div
            role="status"
            className={`${styles.feedback} ${importMessage.type === 'success' ? styles.success : styles.error}`}
          >
            {importMessage.type === 'success' ? <Check size={14} className="mr-6" /> : null}
            {importMessage.text}
          </div>
        )}

        {/* Import Section */}
        <div className="border-top pt-16">
          <label htmlFor="import-file-input" className="block text-sm font-bold mb-8">
            Import Wheel File (.csv or .json)
          </label>
          <p className="text-xs text-muted mb-8">
            Import a previously exported CSV or JSON wheel and continue editing it instantly.
          </p>
          <div className="relative">
            <input 
              id="import-file-input"
              type="file" 
              accept=".csv,.json"
              onChange={handleFileUpload}
              className={`w-full text-primary bg-surface-2 pointer rounded-sm text-sm px-14 py-10 ${styles.fileInput}`}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
