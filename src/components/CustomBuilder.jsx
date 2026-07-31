import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, Check } from '../lib/icons';
import { COLOR_SCHEMES } from '../services/aiService';
import styles from './CustomBuilder.module.css';

function getOptionLabel(index) {
  let suffix = '';
  let i = index;
  while (i >= 0) {
    suffix = String.fromCharCode(65 + (i % 26)) + suffix;
    i = Math.floor(i / 26) - 1;
  }
  return `Option ${suffix}`;
}

export function CustomBuilder({ onLoadCustomWheel }) {
  const [wheelTitle, setWheelTitle] = useState('My Custom Decision Wheel');
  const [category, setCategory] = useState('General');
  const [items, setItems] = useState([
    { id: '1', label: 'Option A', weight: 1, color: COLOR_SCHEMES.electric[0] },
    { id: '2', label: 'Option B', weight: 1, color: COLOR_SCHEMES.electric[1] },
    { id: '3', label: 'Option C', weight: 1, color: COLOR_SCHEMES.electric[2] },
    { id: '4', label: 'Option D', weight: 1, color: COLOR_SCHEMES.electric[3] }
  ]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddItem = () => {
    const colors = COLOR_SCHEMES.electric;
    const newItem = {
      id: `custom-${Date.now()}-${items.length}`,
      label: getOptionLabel(items.length),
      weight: 1,
      color: colors[items.length % colors.length]
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 2) {
      alert("A wheel must have at least 2 options!");
      return;
    }
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleLaunch = () => {
    const wheelData = {
      title: wheelTitle || 'Custom Wheel',
      category,
      options: items
    };
    try {
      const existing = JSON.parse(localStorage.getItem('spinpick_saved_wheels') || '[]');
      localStorage.setItem('spinpick_saved_wheels', JSON.stringify([wheelData, ...existing]));
    } catch (e) {
      console.warn('Failed to save custom wheel to localStorage:', e);
    }
    
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onLoadCustomWheel(wheelData);
    }, 600);
  };

  return (
    <div className={`${styles.customBuilder__root} mx-auto`}>
      <div className={`${styles.customBuilder__panel} glass-panel p-32`}>
        
        <div className={styles.customBuilder__sectionHeader}>
          <span className="mono text-xs text-lime uppercase tracking-wider font-bold">
            CUSTOM BUILDER
          </span>
          <h2 className={`${styles.customBuilder__sectionTitle} mt-4 font-extrabold`}>
            Custom Builder
          </h2>
          <p className="text-muted text-base">
            Design your own weighted slices, assign custom probability ratios, and launch into the studio.
          </p>
          <p className="text-muted text-sm mt-8">
            Tip: weights above 1 make an option more likely to win, while vivid colors help distinguish slices at a glance.
          </p>
        </div>

        {/* Wheel Meta Inputs */}
        <div className={`${styles.customBuilder__metaGrid} mb-24`}>
          <div>
            <label htmlFor="custom-wheel-title" className="block font-bold mb-6 text-sm">
              Wheel Title / Decision Prompt
            </label>
            <input 
              id="custom-wheel-title"
              type="text" 
              value={wheelTitle}
              onChange={(e) => setWheelTitle(e.target.value)}
              className="w-full bg-surface border-medium rounded-sm font-semibold text-primary px-14 py-12"
              placeholder="What decision should this wheel represent?"
            />
          </div>

          <div>
            <label htmlFor="custom-wheel-category" className="block font-bold mb-6 text-sm">
              Category
            </label>
            <select
              id="custom-wheel-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface border-medium rounded-sm text-primary px-14 py-12"
            >
              <option value="General">General</option>
              <option value="Food & Dining">Food & Dining</option>
              <option value="Travel">Travel</option>
              <option value="Productivity">Productivity</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Team / Work">Team / Work</option>
            </select>
          </div>
        </div>

        {/* Slices Matrix */}
        <div className="mb-24">
          <div className="flex justify-between items-center mb-12">
            <h4 className={`${styles.customBuilder__itemLabel} font-bold`}>Wheel Slices ({items.length})</h4>
            <button className="btn btn-secondary btn-sm" onClick={handleAddItem} aria-label="Add new wheel slice">
              <Plus size={15} aria-hidden="true" />
              Add Slice
            </button>
          </div>

          <div className="flex-col gap-10">
            {items.map((item, idx) => (
              <div 
                key={item.id}
                className={`${styles.customBuilder__sliceRow}`}
              >
                <input 
                  type="color"
                  value={item.color}
                  onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                  aria-label={`Color for slice ${idx + 1}`}
                  className={`${styles.customBuilder__colorInput} rounded-full border-none bg-none pointer`}
                  title={`Choose a color for slice ${idx + 1}`}
                />

                <input 
                  type="text"
                  value={item.label}
                  onChange={(e) => handleItemChange(item.id, 'label', e.target.value)}
                  placeholder={`Slice #${idx + 1} name`}
                  aria-label={`Title for slice ${idx + 1}`}
                  className="flex-1 bg-transparent border-none text-primary font-semibold outline-none"
                />

                <div className="flex items-center gap-6">
                  <span className="mono text-xs text-muted">Weight:</span>
                  <input 
                    type="number"
                    min="1"
                    max="10"
                    value={item.weight}
                    onChange={(e) => handleItemChange(item.id, 'weight', Math.max(1, parseInt(e.target.value) || 1))}
                    aria-label={`Weight for slice ${idx + 1}`}
                    className={`${styles.customBuilder__weightInput} bg-surface-2 border-subtle text-primary text-center px-6 py-4`}
                  />
                </div>

                <button 
                  className="btn btn-ghost btn-sm text-danger"
                  onClick={() => handleRemoveItem(item.id)}
                  aria-label={`Remove slice ${item.label}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Launch Button */}
        <div className={`${styles.customBuilder__actions}`}>
          <button className="btn btn-primary btn-lg" onClick={handleLaunch}>
            {savedSuccess ? <Check size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
            {savedSuccess ? 'Saved and launching…' : 'Save & Launch Wheel in Studio'}
          </button>
          {savedSuccess && <span className={styles.customBuilder__successHint}>Wheel saved locally and opening in the studio.</span>}
        </div>

      </div>
    </div>
  );
}
