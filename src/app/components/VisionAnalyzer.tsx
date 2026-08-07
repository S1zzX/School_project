// src/app/components/VisionAnalyzer.tsx — Computer Vision drag-and-drop analyzer
import React, { useState, useRef, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { apiAnalyzeScreenshot, isVisionProviderId, VISION_PROVIDER_STORAGE_KEY, type VisionProviderId, type VisionResult } from '../lib/api';

interface VisionAnalyzerProps {
  /** Called when user clicks "Use This Data" — passes the result back to parent */
  onUseData?: (result: VisionResult) => void;
  /** Called immediately when analysis completes (regardless of Use button) */
  onResult?: (result: VisionResult) => void;
  /** Optional hint text for the AI (e.g. "CS2 skin listing") */
  context?: string;
  /** Vision provider — falls back to saved preference in localStorage */
  provider?: VisionProviderId;
  /** Show the "Use This Data" button */
  showUseButton?: boolean;
  /** Compact mode for embedding inside modals */
  compact?: boolean;
}



function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:image/jpeg;base64," prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function VisionAnalyzer({
  onUseData,
  onResult,
  context,
  provider,
  showUseButton = true,
  compact = false,
}: VisionAnalyzerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFile = useRef<File | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.');
      return;
    }

    setError('');
    setResult(null);
    currentFile.current = file;
    setFileName(file.name);

    // Generate preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // Analyze with Gemini or Groq vision
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const saved = localStorage.getItem(VISION_PROVIDER_STORAGE_KEY);
      const storedProvider = saved && isVisionProviderId(saved) ? saved : undefined;
      const analysis = await apiAnalyzeScreenshot(
        base64,
        file.type,
        context,
        provider ?? storedProvider,
      );
      setResult(analysis);
      onResult?.(analysis);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [context, provider, onResult]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError('');
    setFileName('');
    currentFile.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };



  return (
    <div className="space-y-4">

      {/* ── Drop Zone ── */}
      {!preview && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="vision-drop-zone cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center select-none"
          style={{
            minHeight: compact ? 160 : 220,
            borderColor: isDragging ? 'var(--gs-accent)' : 'var(--gs-border)',
            background: isDragging ? 'rgba(26,111,212,0.05)' : 'transparent',
          }}
        >
          <div className="vision-upload-icon flex size-14 items-center justify-center rounded-2xl mb-4">
          <Upload
            className="size-7 transition-colors"
            style={{ color: isDragging ? 'var(--gs-accent)' : 'var(--gs-faint)' }}
          />
          </div>
          <p className="text-base font-bold mb-1" style={{ color: 'var(--gs-text)' }}>
            {isDragging ? 'Drop to analyze' : 'Drop screenshot here'}
          </p>
          <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>
            or click to browse · PNG, JPG, WEBP · max 10MB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}


      {/* ── Preview + Analyze state ── */}
      {preview && (
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          {/* Image preview */}
          <div className="relative" style={{ maxHeight: compact ? 180 : 280 }}>
            <img
              src={preview}
              alt="Screenshot preview"
              className="w-full object-cover"
              style={{ maxHeight: compact ? 180 : 280 }}
            />
            {/* Overlay when loading */}
            {loading && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
              >
                <div className="relative">
                  <div
                    className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'rgba(26,111,212,0.3)', borderTopColor: '#1a6fd4' }}
                  />
                  <span className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-blue-400" style={{ margin: 'auto', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: 16, height: 16 }} />
                </div>
                <p className="text-sm font-semibold text-white">Analyzing with AI Vision…</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Detecting game, items, rank & stats</p>
              </div>
            )}
            {/* Top bar */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm"
                style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)' }}
              >
                {fileName}
              </span>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm transition-colors"
                style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)' }}
                title="Upload new image"
              >
                <RotateCcw className="size-3" /> Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border text-sm" style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)' }}>
          <AlertCircle className="size-4 shrink-0 mt-0.5" style={{ color: 'var(--gs-faint)' }} />
          <p>{error}</p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {result && !loading && (
        <div className="space-y-4">

          {/* Status row */}
          <div className="flex items-start justify-between gap-4 pt-1">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>
                {result.detected
                  ? `${result.game ?? 'Game'} detected`
                  : 'No game content detected'
                }
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--gs-faint)' }}>
                {result.description}
              </p>
            </div>
            <span className="shrink-0 text-xs mt-0.5" style={{ color: 'var(--gs-faint)' }}>
              {result.confidence} confidence
            </span>
          </div>

          {/* Data table */}
          {result.detected && (() => {
            const rows = [
              result.type        && { label: 'Type',         value: result.type },
              result.item        && { label: 'Item / Skin',  value: result.item },
              result.wear        && { label: 'Wear',         value: result.wear },
              result.float       && { label: 'Float',        value: result.float },
              result.rank        && { label: 'Rank',         value: result.rank },
              result.level != null && { label: 'Level',      value: String(result.level) },
              result.hoursPlayed != null && { label: 'Hours played', value: `${result.hoursPlayed}h` },
              result.skinsOwned  != null && { label: 'Skins owned',  value: String(result.skinsOwned) },
              result.marketPrice != null && {
                label: 'Steam Market',
                value: `$${result.marketPrice.toFixed(2)}${result.marketVolume != null ? ` · ${result.marketVolume} sold/24h` : ''}`,
                highlight: true,
              },
              result.marketPriceMedian != null && result.marketPriceMedian !== result.marketPrice && {
                label: 'Market median',
                value: `$${result.marketPriceMedian.toFixed(2)}`,
              },
              result.marketHashName && { label: 'Market listing', value: result.marketHashName },
              result.aiEstimatedPrice != null && result.marketPrice != null && {
                label: 'AI estimate',
                value: `$${result.aiEstimatedPrice.toFixed(2)}`,
              },
              result.estimatedPrice != null && result.marketPrice == null && {
                label: 'Est. price (AI)',
                value: `$${result.estimatedPrice.toFixed(2)}`,
              },
              result.visionProvider && { label: 'AI model', value: result.visionProvider },
              result.game === 'CS2' && result.type === 'skin' && {
                label: 'Catalog check',
                value: result.catalogVerified ? 'Verified CS2 skin' : 'Not verified',
                highlight: result.catalogVerified,
              },
              result.firstStageItem && result.firstStageItem !== result.item && {
                label: 'AI correction',
                value: `${result.firstStageItem} → ${result.item}`,
              },
            ].filter(Boolean) as { label: string; value: string; highlight?: boolean }[];

            if (rows.length === 0) return null;
            return (
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--gs-border)' }}>
                {rows.map((row, i) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                    style={{
                      borderTop: i > 0 ? '1px solid var(--gs-border)' : 'none',
                      background: 'var(--gs-surface)',
                    }}
                  >
                    <span style={{ color: 'var(--gs-faint)' }}>{row.label}</span>
                    <span
                      className="font-medium"
                      style={{ color: row.highlight ? 'var(--gs-accent)' : 'var(--gs-text)' }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Verified Valorant inventory */}
          {result.valorantInventory && result.valorantInventory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--gs-text)' }}>Verified Valorant skins</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--gs-faint)' }}>{result.valorantInventory.length} weapon slots matched to catalog</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Catalog verified</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {result.valorantInventory.map(entry => (
                  <div key={`${entry.weapon}-${entry.skin}`} className="flex items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface-2)' }}>
                    <div className="w-16 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,.18)' }}>
                      {entry.icon ? <img src={entry.icon} alt="" className="w-14 h-8 object-contain" /> : <span className="text-[9px]" style={{ color: 'var(--gs-faint)' }}>{entry.weapon}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--gs-accent)' }}>{entry.weapon}</p>
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--gs-text)' }}>{entry.skin}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--gs-faint)' }}>{entry.tier}{entry.estimatedVp ? ` · ${entry.estimatedVp.min === entry.estimatedVp.max ? entry.estimatedVp.min : `${entry.estimatedVp.min}–${entry.estimatedVp.max}`} VP` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
              {result.replacementValueUsd && (
                <div className="rounded-xl border p-4 flex items-center justify-between gap-4" style={{ borderColor: 'color-mix(in oklab, var(--gs-accent) 35%, var(--gs-border))', background: 'color-mix(in oklab, var(--gs-accent) 7%, var(--gs-surface))' }}>
                  <div><p className="text-xs font-semibold" style={{ color: 'var(--gs-muted)' }}>Estimated replacement cost</p><p className="text-[10px] mt-0.5" style={{ color: 'var(--gs-faint)' }}>Not a resale or marketplace value</p></div>
                  <div className="text-right"><p className="text-lg font-black" style={{ color: 'var(--gs-accent)' }}>${result.replacementValueUsd.min}–${result.replacementValueUsd.max}</p><p className="text-[10px]" style={{ color: 'var(--gs-faint)' }}>{result.valorantTotalVpMin?.toLocaleString()}–{result.valorantTotalVpMax?.toLocaleString()} VP</p></div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {result.tags && result.tags.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>
              {result.tags.join(' · ')}
            </p>
          )}

          {/* Use Data button */}
          {showUseButton && onUseData && result.detected && (
            <button
              onClick={() => onUseData(result)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--gs-accent)' }}
            >
              Use this data to fill listing
            </button>
          )}
        </div>
      )}
    </div>
  );
}
