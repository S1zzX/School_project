// src/app/pages/VisionPage.tsx — Computer Vision page with side chat
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Scan, Sparkles, Upload, WandSparkles, MessageSquare, ArrowUpRight } from 'lucide-react';
import { VisionAnalyzer } from '../components/VisionAnalyzer';
import { VisionChat } from '../components/VisionChat';
import {
  apiVisionStatus,
  isVisionProviderId,
  VISION_PROVIDER_STORAGE_KEY,
  type VisionProviderId,
  type VisionResult,
  type VisionStatus,
} from '../lib/api';

function readStoredProvider(): VisionProviderId | null {
  const saved = localStorage.getItem(VISION_PROVIDER_STORAGE_KEY);
  return saved && isVisionProviderId(saved) ? saved : null;
}

export function VisionPage() {
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null);
  const [visionStatus, setVisionStatus] = useState<VisionStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<VisionProviderId | ''>('');

  useEffect(() => {
    apiVisionStatus()
      .then((status) => {
        setVisionStatus(status);
        const stored = readStoredProvider();
        const initial =
          (stored && status.providers.some((p) => p.id === stored) ? stored : null) ??
          status.defaultProvider ??
          status.providers[0]?.id ??
          '';
        setSelectedProvider(initial);
      })
      .catch(() => {
        setVisionStatus({
          online: false,
          provider: null,
          defaultProvider: null,
          label: null,
          configured: 'unknown',
          providers: [],
        });
      });
  }, []);

  const handleProviderChange = (value: string) => {
    if (!isVisionProviderId(value)) return;
    setSelectedProvider(value);
    localStorage.setItem(VISION_PROVIDER_STORAGE_KEY, value);
  };

  const selectedOption = visionStatus?.providers.find((p) => p.id === selectedProvider);
  const isOnline = visionStatus?.online ?? false;
  const hasProviders = (visionStatus?.providers.length ?? 0) > 0;
  const selectedReady = selectedOption?.ready !== false;

  return (
    <div className="vision-page max-w-7xl mx-auto px-5 py-8 space-y-6">

      {/* ── Page Header ── */}
      <div className="vision-hero relative overflow-hidden rounded-3xl border px-7 py-8 lg:px-10 lg:py-10 space-y-1">
        <div className="vision-grid absolute inset-0 pointer-events-none" />
        <div className="vision-hero-orb absolute -right-16 -top-24 size-72 rounded-full pointer-events-none" />
        <div className="vision-spark relative z-10 flex size-11 items-center justify-center rounded-2xl mb-4"><Sparkles className="size-5" /></div>
        <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: 'var(--gs-faint)' }}>
          <Scan className="size-3.5" style={{ color: 'var(--gs-accent)' }} />
          <span style={{ color: 'var(--gs-accent)' }}>Computer Vision</span>
          <span>/</span>
          <span>Screenshot Analyzer</span>
        </div>
        <h1 className="relative z-10 text-3xl lg:text-4xl font-black tracking-tight vision-gradient-text">
          Game Screenshot Analyzer
        </h1>
        <p className="relative z-10 text-sm lg:text-base max-w-3xl leading-relaxed mt-3" style={{ color: 'var(--gs-muted)' }}>
          Upload any game screenshot — the AI will identify the item, rank, or account details, then you can chat with it about anything in the image.
        </p>
      </div>

      {/* ── Info strip ── */}
      <div
        className="vision-control-bar flex flex-wrap items-center gap-x-6 gap-y-3 text-xs px-5 py-4 rounded-2xl border"
        style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}
      >
        <label className="flex items-center gap-2" style={{ color: 'var(--gs-faint)' }}>
          <span className="font-semibold shrink-0" style={{ color: 'var(--gs-muted)' }}>Model:</span>
          <span className="relative inline-flex items-center">
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={!hasProviders}
              className="appearance-none rounded-lg border py-1.5 pl-2.5 pr-7 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: 'var(--gs-border)',
                background: 'var(--gs-bg)',
                color: 'var(--gs-text)',
              }}
            >
              {!hasProviders && <option value="">No models configured</option>}
              {visionStatus?.providers.map((p) => (
                <option key={p.id} value={p.id} disabled={p.ready === false}>
                  {p.shortLabel} — {p.model}{p.ready === false ? ' (not ready)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 size-3.5"
              style={{ color: 'var(--gs-faint)' }}
            />
          </span>
        </label>
        {selectedOption?.id === 'ollama' && selectedOption.ready === false && (
          <span className="text-amber-600 dark:text-amber-400">
            Install Ollama → run <code className="text-xs">ollama pull {selectedOption.model}</code>
          </span>
        )}
        <span style={{ color: 'var(--gs-faint)' }}>
          <span className="font-semibold" style={{ color: 'var(--gs-muted)' }}>Supports: </span>
          CS2 · Valorant · LoL · Apex · PUBG · Fortnite
        </span>
        <span style={{ color: 'var(--gs-faint)' }}>
          <span className="font-semibold" style={{ color: 'var(--gs-muted)' }}>CS2 prices: </span>
          Steam Community Market (live)
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
          />
          <span style={{ color: 'var(--gs-faint)' }}>
            {isOnline ? (selectedReady ? 'AI Online' : 'Local model not ready') : 'AI Offline'}
          </span>
        </span>
      </div>

      {/* ── Two-column: Analyzer + Chat ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* Left — Upload + Analysis */}
        <div
          className="vision-work-card lg:col-span-5 rounded-3xl border overflow-hidden"
          style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gs-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>Upload Screenshot</h2>
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>PNG, JPG, WEBP accepted</p>
          </div>
          <div className="p-5">
            <VisionAnalyzer
              showUseButton={false}
              provider={selectedProvider || undefined}
              onUseData={setVisionResult}
              onResult={setVisionResult}
            />
          </div>
        </div>

        {/* Right — AI Chat */}
        <div className="vision-chat-wrap lg:col-span-7">
          <VisionChat visionResult={visionResult} provider={selectedProvider || undefined} />
        </div>
      </div>

      {/* ── How it works ── */}
      <div
        className="vision-steps rounded-3xl border overflow-hidden"
        style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--gs-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>How it works</h2>
        </div>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--gs-border)' }}>
          {[
            { n: '1', title: 'Upload', icon: Upload, body: 'Drag and drop or click to select any gaming screenshot from your device.' },
            { n: '2', title: 'Analyze', icon: WandSparkles, body: 'Pick a vision model above, then the AI reads the image and extracts structured game data.' },
            { n: '3', title: 'Chat', icon: MessageSquare, body: 'Ask the AI anything about the screenshot — price, trade tips, rank info and more.' },
          ].map(step => (
            <div key={step.n} className="vision-step-card group px-6 py-6 flex gap-4">
              <span className="vision-step-icon"><step.icon className="size-5" /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--gs-accent)' }}>Step 0{step.n}</p>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--gs-text)' }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--gs-faint)' }}>{step.body}</p>
              </div>
              <ArrowUpRight className="size-4 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Shop owner note ── */}
      <p className="text-xs pb-2" style={{ color: 'var(--gs-faint)' }}>
        Shop Owner?{' '}
        <Link
          to="/shop-owner"
          className="underline underline-offset-2 transition-colors hover:text-gs-muted"
          style={{ color: 'var(--gs-muted)' }}
        >
          Open the Shop Dashboard
        </Link>
        {' '}to scan screenshots and auto-fill listing details directly from there.
      </p>

    </div>
  );
}
