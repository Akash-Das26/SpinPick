import React, { useState, useRef } from 'react';
import { WheelItem, WheelTheme } from '../types';
import { CURATED_COLOR_SWATCHES } from '../utils/themes';
import { generateAiOptions, aiResultToWheelItems } from '../utils/ai';
import {
  Plus,
  Trash2,
  Shuffle,
  ArrowDownAZ,
  Eye,
  EyeOff,
  Copy,
  Layers,
  Sparkles,
  Palette,
  Sliders,
  Check,
  Image as ImageIcon,
  X,
  Upload,
  Wand2,
  Brain,
  Loader2,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { secureShuffle } from '../utils/random';
import { SmartWeightingModal } from './SmartWeightingModal';

interface WheelEditorProps {
  items: WheelItem[];
  theme: WheelTheme;
  onUpdateItems: (items: WheelItem[]) => void;
  onAddItem: (item: Omit<WheelItem, 'id'>) => void;
  onDeleteItem: (id: string) => void;
  onToggleItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<WheelItem>) => void;
  onBulkAdd: (rawText: string) => void;
}

export const WheelEditor: React.FC<WheelEditorProps> = ({
  items,
  theme,
  onUpdateItems,
  onAddItem,
  onDeleteItem,
  onToggleItem,
  onUpdateItem,
  onBulkAdd,
}) => {
  const [inputText, setInputText] = useState('');
  const [inputIcon, setInputIcon] = useState('');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [showWeightSliders, setShowWeightSliders] = useState(false);
  const [showSmartWeightingModal, setShowSmartWeightingModal] = useState(false);
  const [activeColorPickerItemId, setActiveColorPickerItemId] = useState<string | null>(null);
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOptionCount, setAiOptionCount] = useState(8);
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ options: Array<{ label: string; desc: string; weight: number }>; recommendedIndex: number; reasoning: string; actionSteps: string[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rowFileInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const activeItems = items.filter((i) => i.enabled && i.weight > 0);
  const totalWeight = activeItems.reduce((sum, i) => sum + i.weight, 0);

  // File upload handler for new item form
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read image as base64 Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setInputImage(event.target.result as string);
        sound.playPop(true);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be reselected
    e.target.value = '';
  };

  // File upload handler for existing item row
  const handleRowImageFileChange = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onUpdateItem(itemId, { imageUrl: event.target.result as string });
        sound.playPop(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Pick next color from theme
    const nextColorIndex = items.length % theme.sliceColors.length;
    const color = theme.sliceColors[nextColorIndex];

    onAddItem({
      text: inputText.trim(),
      color,
      weight: 1,
      enabled: true,
      icon: inputIcon.trim() || undefined,
      imageUrl: inputImage || undefined,
    });

    setInputText('');
    setInputIcon('');
    setInputImage(null);
    sound.playPop(true);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiIsGenerating) return;
    setAiIsGenerating(true);
    setAiResult(null);
    try {
      const result = await generateAiOptions(aiPrompt, { optionCount: aiOptionCount });
      setAiResult(result);
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setAiIsGenerating(false);
    }
  };

  const handleApplyAiResult = () => {
    if (!aiResult) return;
    const newItems = aiResultToWheelItems(aiResult, theme.sliceColors);
    newItems.forEach((item) => {
      onAddItem(item);
    });
    setShowAiGenerateModal(false);
    setAiPrompt('');
    setAiResult(null);
    sound.playVictoryFanfare();
  };

  const handleBulkSubmit = () => {
    if (!bulkInput.trim()) return;
    onBulkAdd(bulkInput);
    setBulkInput('');
    setShowBulkModal(false);
    sound.playPop(true);
  };

  const handleShuffle = () => {
    const shuffled = secureShuffle(items);
    onUpdateItems(shuffled);
    sound.playPop(false);
  };

  const handleSortAZ = () => {
    const sorted = [...items].sort((a, b) => a.text.localeCompare(b.text));
    onUpdateItems(sorted);
    sound.playPop(false);
  };

  const handleDuplicate = (item: WheelItem) => {
    const nextColorIndex = items.length % theme.sliceColors.length;
    onAddItem({
      text: `${item.text} (Copy)`,
      color: theme.sliceColors[nextColorIndex],
      weight: item.weight,
      enabled: true,
      icon: item.icon,
      imageUrl: item.imageUrl,
      note: item.note,
    });
    sound.playPop(true);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all choices?')) {
      onUpdateItems([]);
      sound.playPop(false);
    }
  };

  const handleReapplyThemeColors = () => {
    const recolored = items.map((item, idx) => ({
      ...item,
      color: theme.sliceColors[idx % theme.sliceColors.length],
    }));
    onUpdateItems(recolored);
    sound.playPop(true);
  };

  const handleApplySmartWeights = (
    newWeights: { id: string; weight: number; reason?: string }[]
  ) => {
    const updated = items.map((item) => {
      const found = newWeights.find((w) => w.id === item.id);
      return found ? { ...item, weight: found.weight } : item;
    });
    onUpdateItems(updated);
    setShowWeightSliders(true);
    sound.playVictoryFanfare();
  };

  return (
    <div id="wheel-editor-container" className="flex flex-col h-full bg-black/40 backdrop-blur-xl rounded-2xl border border-white/5 p-5 shadow-2xl relative">
      {/* Header with quick stats and bulk actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Wheel Choices</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-indigo-300 border border-white/10">
              {activeItems.length} active / {items.length} total
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="ai-generate-btn"
            onClick={() => {
              setShowAiGenerateModal(true);
              sound.playPop(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/30 via-teal-600/30 to-cyan-600/20 hover:from-emerald-600/50 hover:to-cyan-600/50 text-xs font-bold text-emerald-200 hover:text-white border border-emerald-500/40 transition-all shadow-sm shadow-emerald-500/20 active:scale-95"
            title="AI Generate: Create wheel options from a text prompt"
          >
            <Brain className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Generate</span>
          </button>

          <button
            id="smart-weighting-btn"
            onClick={() => {
              setShowSmartWeightingModal(true);
              sound.playPop(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-pink-600/20 hover:from-indigo-600/50 hover:to-purple-600/50 text-xs font-bold text-indigo-200 hover:text-white border border-indigo-500/40 transition-all shadow-sm shadow-indigo-500/20 active:scale-95"
            title="Smart Weighting: Assign slice weights intelligently with Gemini AI"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Smart Weighting</span>
          </button>

          <button
            id="bulk-import-btn"
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white border border-white/10 transition-all"
            title="Paste multiple choices (Bulk add)"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bulk Paste</span>
          </button>

          <button
            id="shuffle-items-btn"
            onClick={handleShuffle}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            title="Shuffle choices order"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            id="sort-az-btn"
            onClick={handleSortAZ}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            title="Sort alphabetically"
          >
            <ArrowDownAZ className="w-3.5 h-3.5" />
          </button>

          <button
            id="recolor-theme-btn"
            onClick={handleReapplyThemeColors}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            title="Apply theme colors palette"
          >
            <Palette className="w-3.5 h-3.5 text-pink-400" />
          </button>

          <button
            id="toggle-weights-btn"
            onClick={() => setShowWeightSliders(!showWeightSliders)}
            className={`p-2 rounded-xl border transition-all ${
              showWeightSliders
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Toggle probability / weight sliders"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {items.length > 0 && (
            <button
              id="clear-all-items-btn"
              onClick={handleClearAll}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all"
              title="Clear all choices"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Add Single Item Form */}
      <form onSubmit={handleAddSingle} className="my-4 space-y-2">
        <div className="flex gap-2">
          {/* Emoji/Icon input */}
          <input
            id="item-emoji-input"
            type="text"
            value={inputIcon}
            onChange={(e) => setInputIcon(e.target.value)}
            placeholder="🎯"
            maxLength={4}
            className="w-12 text-center rounded-xl bg-black/50 border border-white/10 px-2 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
            title="Optional Emoji / Icon"
          />

          {/* Main Label input */}
          <input
            id="item-name-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Add new choice (e.g. Pizza, Cinema, Prize)..."
            className="flex-1 rounded-xl bg-black/50 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />

          {/* Hidden image file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFileChange}
          />

          {/* Image upload trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
              inputImage
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Upload image for this wheel segment"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Add submit button */}
          <button
            id="add-single-item-btn"
            type="submit"
            disabled={!inputText.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Uploaded image preview pill (if selected for new item) */}
        {inputImage && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 w-fit animate-fade-in">
            <img
              src={inputImage}
              alt="Preview"
              className="w-5 h-5 rounded-full object-cover border border-indigo-400"
            />
            <span>Segment image attached</span>
            <button
              type="button"
              onClick={() => setInputImage(null)}
              className="p-0.5 hover:text-white text-indigo-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </form>

      {/* Item List Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[390px] custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <Sparkles className="w-8 h-8 text-indigo-400 mb-2 animate-pulse" />
            <p className="text-sm font-medium text-slate-300">Your wheel is currently empty.</p>
            <p className="text-xs text-slate-500 mt-1">
              Add choices above or use Bulk Paste to get started!
            </p>
          </div>
        ) : (
          items.map((item) => {
            const odds =
              totalWeight > 0 && item.enabled
                ? ((item.weight / totalWeight) * 100).toFixed(1)
                : '0';

            const isColorPickerOpen = activeColorPickerItemId === item.id;

            return (
              <div
                key={item.id}
                id={`item-row-${item.id}`}
                className={`group flex flex-col gap-2 p-3 rounded-xl border transition-all relative ${
                  item.enabled
                    ? 'bg-white/5 border-white/5 hover:border-white/10'
                    : 'bg-white/[0.02] border-white/[0.02] opacity-40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {/* Color Picker Swatch Button */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveColorPickerItemId(isColorPickerOpen ? null : item.id)
                      }
                      className="w-6 h-6 rounded-full border border-white/30 p-0 shadow-md transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ backgroundColor: item.color }}
                      title="Choose segment color palette swatch"
                    />

                    {/* Popover Swatch Palette Picker */}
                    {isColorPickerOpen && (
                      <div
                        className="absolute left-0 top-8 z-40 p-3 bg-[#0d0d1a] border border-white/15 rounded-xl shadow-2xl w-48 space-y-2 animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 pb-1 border-b border-white/10">
                          <span>Palette Swatches</span>
                          <button
                            onClick={() => setActiveColorPickerItemId(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Swatches Grid */}
                        <div className="grid grid-cols-6 gap-1.5">
                          {CURATED_COLOR_SWATCHES.map((swatch) => (
                            <button
                              key={swatch}
                              onClick={() => {
                                onUpdateItem(item.id, { color: swatch });
                                setActiveColorPickerItemId(null);
                                sound.playPop(true);
                              }}
                              className="w-5 h-5 rounded-md border border-white/10 hover:scale-125 transition-transform"
                              style={{ backgroundColor: swatch }}
                            />
                          ))}
                        </div>

                        {/* Direct Native HTML5 Color Picker */}
                        <div className="pt-1 border-t border-white/10 flex items-center justify-between">
                          <label className="text-[10px] text-slate-400 font-medium">Custom Color:</label>
                          <input
                            type="color"
                            value={item.color}
                            onChange={(e) => onUpdateItem(item.id, { color: e.target.value })}
                            className="w-6 h-6 rounded cursor-pointer border border-white/20 p-0 overflow-hidden bg-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Segment Image Thumbnail / Upload Button */}
                  <div className="flex-shrink-0 relative">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => {
                        rowFileInputRefs.current.set(item.id, el);
                      }}
                      onChange={(e) => handleRowImageFileChange(item.id, e)}
                    />

                    {item.imageUrl ? (
                      <div className="relative group/img">
                        <img
                          src={item.imageUrl}
                          alt="Segment"
                          onClick={() => rowFileInputRefs.current.get(item.id)?.click()}
                          className="w-6 h-6 rounded-full object-cover border border-white/40 cursor-pointer shadow-sm hover:opacity-80 transition-opacity"
                          title="Change segment image"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateItem(item.id, { imageUrl: undefined })}
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover/img:opacity-100 transition-opacity shadow"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => rowFileInputRefs.current.get(item.id)?.click()}
                        className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        title="Upload segment image"
                      >
                        <ImageIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Icon/Emoji */}
                  {item.icon && (
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                  )}

                  {/* Item Text Input */}
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => onUpdateItem(item.id, { text: e.target.value })}
                    className="flex-1 bg-transparent text-sm text-slate-200 font-medium focus:outline-none focus:border-b focus:border-indigo-400 truncate"
                  />

                  {/* Probability Badge */}
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-medium ${
                      item.enabled
                        ? 'bg-black/40 text-slate-400 border border-white/5'
                        : 'bg-black/20 text-slate-600'
                    }`}
                    title="Chance of winning"
                  >
                    {odds}%
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleItem(item.id)}
                      className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                      title={item.enabled ? 'Disable (skip in spin)' : 'Enable'}
                    >
                      {item.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                    </button>

                    <button
                      onClick={() => handleDuplicate(item)}
                      className="p-1 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Optional Weight & Multiplier slider bar */}
                {showWeightSliders && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-xs text-slate-400">
                    <span className="text-[11px]">Weight:</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={item.weight}
                      onChange={(e) =>
                        onUpdateItem(item.id, { weight: parseInt(e.target.value, 10) })
                      }
                      className="flex-1 accent-indigo-500 h-1.5 bg-black/60 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-indigo-400 font-semibold w-6 text-right">
                      {item.weight}x
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div
          id="bulk-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            id="bulk-modal-content"
            className="w-full max-w-lg rounded-2xl bg-[#080810]/95 border border-white/10 p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Bulk Add Choices</span>
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste or type your choices below, separated by lines or commas. Emojis at the start of
              a line are automatically recognized!
            </p>

            <textarea
              id="bulk-paste-textarea"
              rows={8}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={"Pizza\nBurger\nSushi\n🌮 Tacos\n🍜 Ramen\nSalad"}
              className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 font-mono"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors border border-white/5"
              >
                Cancel
              </button>
              <button
                id="submit-bulk-add-btn"
                onClick={handleBulkSubmit}
                disabled={!bulkInput.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/30"
              >
                <Check className="w-4 h-4" />
                <span>Add Choices to Wheel</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Smart Weighting Modal */}
      <SmartWeightingModal
        isOpen={showSmartWeightingModal}
        onClose={() => setShowSmartWeightingModal(false)}
        items={items}
        onApplyWeights={handleApplySmartWeights}
      />

      {/* AI Generate Modal */}
      {showAiGenerateModal && (
        <div
          id="ai-generate-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => { setShowAiGenerateModal(false); setAiResult(null); }}
        >
          <div
            id="ai-generate-modal-content"
            className="w-full max-w-lg rounded-2xl bg-[#080810]/95 border border-white/10 p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-400" />
                <span>AI Generate Options</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {import.meta.env.VITE_GEMINI_API_KEY ? 'Gemini AI' : 'No API Key'}
                </span>
              </h3>
              <button
                onClick={() => { setShowAiGenerateModal(false); setAiResult(null); }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {import.meta.env.VITE_GEMINI_API_KEY
                ? 'Describe what you need, and Gemini AI will generate creative options for your wheel.'
                : '⚠️ Add VITE_GEMINI_API_KEY to your .env file for real AI-powered generation. Currently using offline fallback.'}
            </p>

            <textarea
              id="ai-prompt-textarea"
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="What should the wheel decide? e.g. 'What should I cook for dinner tonight?'"
              className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Options count:</label>
              <select
                value={aiOptionCount}
                onChange={(e) => setAiOptionCount(Number(e.target.value))}
                className="rounded-lg bg-black/50 border border-white/10 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              >
                {[4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>{n} options</option>
                ))}
              </select>
            </div>

            {aiResult && (
              <div className="space-y-3 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl animate-fade-in">
                <p className="text-xs font-bold text-emerald-300">Generated {aiResult.options.length} options:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  {aiResult.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="text-emerald-400 font-mono">{i + 1}.</span>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-slate-500 truncate">— {opt.desc}</span>
                    </div>
                  ))}
                </div>
                {aiResult.reasoning && (
                  <p className="text-xs text-slate-400 italic mt-2">💡 {aiResult.reasoning}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowAiGenerateModal(false); setAiResult(null); }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors border border-white/5"
              >
                Cancel
              </button>

              {!aiResult ? (
                <button
                  id="ai-generate-submit-btn"
                  onClick={handleAiGenerate}
                  disabled={!aiPrompt.trim() || aiIsGenerating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/30"
                >
                  {aiIsGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></>
                  ) : (
                    <><Brain className="w-4 h-4" /><span>Generate</span></>
                  )}
                </button>
              ) : (
                <button
                  id="ai-apply-result-btn"
                  onClick={handleApplyAiResult}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Add to Wheel</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

