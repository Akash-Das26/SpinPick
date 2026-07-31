import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, RotateCcw } from '../lib/icons';
import { COLOR_SCHEMES } from '../services/aiService';
import { useModalA11y } from '../hooks/useModalA11y';
import styles from './SliceEditor.module.css';
export function SliceEditor({ isOpen, onClose, options, setOptions }) {
  const [newLabel, setNewLabel] = useState('');
  const modalRef = useRef(null);

  useModalA11y({ isOpen, modalRef, onClose });

  if (!isOpen) return null;

  const handleLabelChange = (id, label) => {
    setOptions(options.map(o => o.id === id ? { ...o, label } : o));
  };

  const handleWeightChange = (id, weight) => {
    const w = Math.max(1, Math.min(10, parseInt(weight) || 1));
    setOptions(options.map(o => o.id === id ? { ...o, weight: w } : o));
  };

  const handleColorChange = (id, color) => {
    setOptions(options.map(o => o.id === id ? { ...o, color } : o));
  };

  const handleDelete = (id) => {
    if (options.length <= 2) {
      alert("A wheel needs at least 2 options!");
      return;
    }
    setOptions(options.filter(o => o.id !== id));
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
    setOptions([...options, newOpt]);
    setNewLabel('');
  };

  const handleResetWeights = () => {
    setOptions(options.map(o => ({ ...o, weight: 1 })));
  };

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
          <button className="btn btn-secondary btn-sm" onClick={handleResetWeights}>
            <RotateCcw size={14} />
            Reset Equal Weights
          </button>
          
          <button className="btn btn-primary" onClick={onClose}>
            Done Editing
          </button>
        </div>

      </div>
    </div>
  );
}
