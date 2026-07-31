import React, { useState, useRef, useCallback } from 'react';
import { X, Plus, Trash2, RotateCcw, ArrowLeft, ArrowRight } from '../lib/icons';
import { COLOR_SCHEMES } from '../services/aiService';
import { useModalA11y } from '../hooks/useModalA11y';
import styles from './SliceEditor.module.css';

const MAX_HISTORY = 50;

export function SliceEditor({ isOpen, onClose, options, setOptions }) {
  const [newLabel, setNewLabel] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const modalRef = useRef(null);
  const initializedRef = useRef(false);

  // Save to history when options change
  const saveToHistory = useCallback((newOptions) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newOptions)));
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, newHistory.length - 1));
  }, [historyIndex]);

  const handleLabelChange = (id, label) => {
    const newOptions = options.map(o => o.id === id ? { ...o, label } : o);
    setOptions(newOptions);
    saveToHistory(newOptions);
  };

  const handleWeightChange = (id, weight) => {
    const w = Math.max(1, Math.min(10, parseInt(weight) || 1));
    const newOptions = options.map(o => o.id === id ? { ...o, weight: w } : o);
    setOptions(newOptions);
    saveToHistory(newOptions);
  };

  const handleColorChange = (id, color) => {
    const newOptions = options.map(o => o.id === id ? { ...o, color } : o);
    setOptions(newOptions);
    saveToHistory(newOptions);
  };

  const handleDelete = (id) => {
    if (options.length <= 2) {
      alert("A wheel needs at least 2 options!");
      return;
    }
    const newOptions = options.filter(o => o.id !== id);
    setOptions(newOptions);
    saveToHistory(newOptions);
  };

  const handleAddOption = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const colors = COLOR_SCHEMES.electric;
    const newOpt = {
      id: `opt-custom-${Date.now()}`,
      label: newLabel.trim(),
      desc: 'User created slice option',
      weight: 1,
      color: colors[options.length % colors.length]
    };
    const newOptions = [...options, newOpt];
    setOptions(newOptions);
    setNewLabel('');
    saveToHistory(newOptions);
  };

  const handleResetWeights = () => {
    const newOptions = options.map(o => ({ ...o, weight: 1 }));
    setOptions(newOptions);
    saveToHistory(newOptions);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setOptions(history[newIndex]);
      setHistoryIndex(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setOptions(history[newIndex]);
      setHistoryIndex(newIndex);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1 && history.length > 0;

  // Initialize history on first open
  if (!initializedRef.current && options.length > 0) {
    initializedRef.current = true;
    setHistory([JSON.parse(JSON.stringify(options))]);
    setHistoryIndex(0);
  }

  useModalA11y({ isOpen, modalRef, onClose });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slice-editor-title"
      className={`${styles.overlay} grid-center`}
    >
      <div ref={modalRef} className={`glass-panel flex-col overflow-hidden ${styles.modal}`}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-24 py-20 border-bottom">
          <div>
            <h3 id="slice-editor-title" className={`font-extrabold ${styles.title}`}>Customize Wheel Slices</h3>
            <p className="text-sm text-muted">Adjust option titles, weights, and slice colors</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close slice editor">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Add New Option Form */}
        <form onSubmit={handleAddOption} className="flex gap-10 px-24 py-16 border-bottom">
          <input 
            type="text" 
            placeholder="Type a new choice..." 
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 text-primary bg-surface rounded-sm border-medium py-10 px-14"
          />
          <button type="submit" className="btn btn-primary btn-sm">
            <Plus size={16} />
            Add Option
          </button>
        </form>

        {/* Slice List */}
        <div className="flex-1 overflow-y-auto flex-col gap-10 px-24 py-16">
          {options.map((opt, idx) => (
            <div 
              key={opt.id}
              className={styles.optionItem}
            >
              {/* Color picker dot */}
              <input 
                type="color" 
                value={opt.color} 
                onChange={(e) => handleColorChange(opt.id, e.target.value)}
                aria-label={`Slice color for ${opt.label}`}
                title="Change slice color"
                className={styles.colorInput}
              />

              {/* Title input */}
              <input 
                type="text" 
                value={opt.label} 
                onChange={(e) => handleLabelChange(opt.id, e.target.value)}
                aria-label={`Label for slice ${idx + 1}`}
                className={styles.titleInput}
              />

              {/* Weight selector */}
              <div className="flex items-center gap-6">
                <span className="mono text-xs text-muted">Weight:</span>
                <select 
                  value={opt.weight || 1} 
                  onChange={(e) => handleWeightChange(opt.id, e.target.value)}
                  aria-label={`Probability weight for ${opt.label}`}
                  className={styles.weightSelect}
                >
                  <option value={1}>1x Normal</option>
                  <option value={2}>2x Double</option>
                  <option value={3}>3x Triple</option>
                  <option value={5}>5x High</option>
                </select>
              </div>

              {/* Delete button */}
              <button 
                className={`btn btn-ghost btn-sm ${styles.deleteButton}`} 
                onClick={() => handleDelete(opt.id)}
                aria-label={`Remove slice: ${opt.label}`}
                title="Remove Slice"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center px-24 py-16 border-top">
          <div className="flex items-center gap-8">
            <button 
              className={`btn btn-secondary btn-sm ${!canUndo ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="Undo"
              title="Undo"
            >
              <ArrowLeft size={14} />
            </button>
            <button 
              className={`btn btn-secondary btn-sm ${!canRedo ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={handleRedo}
              disabled={!canRedo}
              aria-label="Redo"
              title="Redo"
            >
              <ArrowRight size={14} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleResetWeights}>
              <RotateCcw size={14} />
              Reset Equal Weights
            </button>
          </div>
          
          <button className="btn btn-primary" onClick={onClose}>
            Done Editing
          </button>
        </div>

      </div>
    </div>
  );
}