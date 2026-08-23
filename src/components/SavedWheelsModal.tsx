import React, { useState } from 'react';
import { SavedWheel, WheelItem, WheelConfig } from '../types';
import { PRESET_WHEELS } from '../utils/presets';
import { Bookmark, Sparkles, FolderDown, Upload, Trash2, Plus, Check, X } from 'lucide-react';
import { sound } from '../utils/audio';
import { useModalA11y } from '../hooks/useModalA11y';

interface SavedWheelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedWheels: SavedWheel[];
  currentItems: WheelItem[];
  currentConfig: WheelConfig;
  currentThemeId: string;
  onLoadWheel: (wheel: SavedWheel) => void;
  onSaveCurrentWheel: (title: string, description?: string) => void;
  onDeleteSavedWheel: (id: string) => void;
  onImportWheel: (imported: SavedWheel) => void;
}

export const SavedWheelsModal: React.FC<SavedWheelsModalProps> = ({
  isOpen,
  onClose,
  savedWheels,
  onLoadWheel,
  onSaveCurrentWheel,
  onDeleteSavedWheel,
  onImportWheel,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'saved' | 'save_current'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const modalRef = useModalA11y({ isOpen, onClose });
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Presets' },
    { id: 'food', label: '🍕 Food & Dining' },
    { id: 'games', label: '🎬 Movies & Games' },
    { id: 'party', label: '🎲 Party & Fun' },
    { id: 'work', label: '👥 Work & Standups' },
    { id: 'fitness', label: '🏋️ Fitness' },
    { id: 'decision', label: '🔮 Decisions' },
  ];

  const filteredPresets =
    selectedCategory === 'all'
      ? PRESET_WHEELS
      : PRESET_WHEELS.filter((p) => p.category === selectedCategory);

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onSaveCurrentWheel(newTitle.trim(), newDesc.trim() || undefined);
    setNewTitle('');
    setNewDesc('');
    setActiveTab('saved');
    sound.playPop(true);
  };

  const handleExportJSON = (wheel: SavedWheel) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(wheel, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `spinpick_${wheel.title.replace(/\s+/g, '_').toLowerCase()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    sound.playPop(true);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.items && Array.isArray(parsed.items)) {
          onImportWheel({
            id: `custom-${Date.now()}`,
            title: parsed.title || 'Imported Wheel',
            description: parsed.description,
            category: 'custom',
            items: parsed.items,
            themeId: parsed.themeId || 'cyber-neon',
            config: parsed.config || {},
            updatedAt: Date.now(),
          });
          setActiveTab('saved');
          sound.playPop(true);
        } else {
          alert('Invalid wheel JSON format');
        }
      } catch {
        alert('Could not parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="saved-wheels-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="saved-wheels-content"
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-[#080810]/95 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-6 space-y-4 max-h-[85vh] flex flex-col transform animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/5 text-indigo-400 border border-white/10">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Wheel Templates & Library</h3>
              <p className="text-xs text-slate-400">Load presets or save your custom wheels</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-3 flex-shrink-0">
          <button
            id="tab-presets-btn"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Preset Wheels</span>
          </button>

          <button
            id="tab-saved-btn"
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'saved'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
            <span>My Saved Wheels ({savedWheels.length})</span>
          </button>

          <button
            id="tab-save-current-btn"
            onClick={() => setActiveTab('save_current')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'save_current'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save Current Wheel</span>
          </button>
        </div>

        {/* Tab 1: Presets */}
        {activeTab === 'presets' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-3">
            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 flex-shrink-0 custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 custom-scrollbar">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex flex-col justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/[0.08] transition-all group"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                      {preset.title}
                    </h4>
                    {preset.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {preset.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 text-slate-300 font-mono border border-white/5">
                        {preset.items.length} choices
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 text-indigo-400 font-mono capitalize border border-white/5">
                        {preset.category}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => {
                        onLoadWheel(preset);
                        onClose();
                        sound.playPop(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold transition-all border border-indigo-500/20"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Load This Wheel</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Saved Wheels */}
        {activeTab === 'saved' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-3">
            {/* Import / Export action bar */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5 flex-shrink-0">
              <span className="text-xs text-slate-400">
                Wheels are stored locally in your browser
              </span>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold cursor-pointer border border-white/10 transition-colors">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Saved Wheels Grid */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {savedWheels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <Bookmark className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-sm">No custom saved wheels yet.</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Click "Save Current Wheel" tab above to save your custom wheel!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedWheels.map((wheel) => (
                    <div
                      key={wheel.id}
                      className="flex flex-col justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-sm truncate">
                            {wheel.title}
                          </h4>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${wheel.title}"?`)) {
                                onDeleteSavedWheel(wheel.id);
                                sound.playPop(false);
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            title="Delete wheel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {wheel.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {wheel.description}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 text-slate-300 font-mono border border-white/5">
                            {wheel.items.length} choices
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(wheel.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                        <button
                          onClick={() => {
                            onLoadWheel(wheel);
                            onClose();
                            sound.playPop(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold transition-all border border-indigo-500/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Load Wheel</span>
                        </button>

                        <button
                          onClick={() => handleExportJSON(wheel)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
                          title="Export JSON"
                        >
                          <FolderDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Save Current Wheel */}
        {activeTab === 'save_current' && (
          <form onSubmit={handleSaveCurrent} className="flex-1 flex flex-col space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Wheel Title *
              </label>
              <input
                id="save-wheel-title-input"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Friday Lunch Spots, Team Standup, Secret Santa"
                className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Add any notes about this wheel..."
                className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors border border-white/5"
              >
                Cancel
              </button>
              <button
                id="submit-save-wheel-btn"
                type="submit"
                disabled={!newTitle.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/25"
              >
                <Check className="w-4 h-4" />
                <span>Save to My Wheels</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
