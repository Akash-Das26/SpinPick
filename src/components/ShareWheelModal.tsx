import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WheelItem, WheelConfig, UserProfile } from '../types';
import { encodeWheelToUrl, getSocialShareLinks } from '../utils/share';
import { sound } from '../utils/audio';
import QRCode from 'qrcode';
import { useModalA11y } from '../hooks/useModalA11y';
import {
  Share2,
  Copy,
  Check,
  X,
  ExternalLink,
  QrCode,
  Globe,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface ShareWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: WheelItem[];
  config: WheelConfig;
  themeId?: string;
  user: UserProfile | null;
}

export const ShareWheelModal: React.FC<ShareWheelModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  config,
  themeId = 'cyber-neon',
  user,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const modalRef = useModalA11y({ isOpen, onClose });
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const shareUrl = useMemo(() => {
    if (!isOpen) return '';
    return encodeWheelToUrl(title, items, config, themeId, user?.name);
  }, [isOpen, title, items, config, themeId, user]);

  const socialLinks = useMemo(() => {
    return getSocialShareLinks(shareUrl, title || 'Spin Wheel');
  }, [shareUrl, title]);

  // Local QR code generation (no third-party API — privacy safe)
  useEffect(() => {
    if (!showQr || !shareUrl || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, shareUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#ffffff', light: '#080810' },
      errorCorrectionLevel: 'M',
    }).catch(() => {});
  }, [showQr, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      sound.playPop(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      id="share-wheel-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="share-wheel-modal-content"
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-[#080812]/95 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-6 sm:p-7 space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share Your Spin Wheel</h3>
              <p className="text-xs text-slate-400">
                Share this interactive wheel with friends, teams, or audience
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wheel Summary Card */}
        <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-400 font-medium">Wheel Title</div>
            <div className="text-sm font-bold text-white truncate">{title || 'Custom Spin Wheel'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {items.filter((i) => i.enabled).length} active choices • Font: {config.fontFamily || 'Outfit'}
            </div>
          </div>
          {user && (
            <div className="text-right pl-3">
              <span className="text-[10px] text-slate-500 block">Created by</span>
              <span className="text-xs font-semibold text-indigo-300">{user.name}</span>
            </div>
          )}
        </div>

        {/* Copy Shareable Link Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Shareable URL Link:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono focus:outline-none select-all truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex-shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Social Media Share Buttons Grid */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Share to Social Media & Apps:
            </label>
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQr ? 'Hide QR' : 'Show QR Code'}</span>
            </button>
          </div>

          {showQr && (
            <div className="p-4 bg-black/60 rounded-xl border border-white/10 flex flex-col items-center justify-center space-y-2 animate-fade-in">
              <canvas
                ref={qrCanvasRef}
                className="rounded-lg border border-white/20 shadow-xl"
                aria-label="QR code for sharing this wheel"
              />
              <p className="text-[11px] text-slate-400">Scan with phone camera to spin immediately</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* X / Twitter */}
            <a
              href={socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-all hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X (Twitter)</span>
            </a>

            {/* WhatsApp */}
            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 text-xs font-medium text-[#25D366] transition-all hover:scale-[1.02]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={socialLinks.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/20 text-xs font-medium text-[#29b6f6] transition-all hover:scale-[1.02]"
            >
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </a>

            {/* Facebook */}
            <a
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 text-xs font-medium text-[#4b9eff] transition-all hover:scale-[1.02]"
            >
              <Globe className="w-4 h-4" />
              <span>Facebook</span>
            </a>

            {/* Reddit */}
            <a
              href={socialLinks.reddit}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#ff4500]/10 hover:bg-[#ff4500]/20 border border-[#ff4500]/20 text-xs font-medium text-[#ff6a33] transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Reddit</span>
            </a>

            {/* LinkedIn */}
            <a
              href={socialLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0a66c2]/10 hover:bg-[#0a66c2]/20 border border-[#0a66c2]/20 text-xs font-medium text-[#3897f0] transition-all hover:scale-[1.02]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>LinkedIn</span>
            </a>

            {/* Email */}
            <a
              href={socialLinks.email}
              className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all hover:scale-[1.02]"
            >
              <span>📧 Send via Email</span>
            </a>
          </div>
        </div>

        {/* Done Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
