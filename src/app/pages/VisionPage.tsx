// src/app/pages/VisionPage.tsx — Computer Vision page with side chat
import React, { useState } from 'react';
import { Link } from 'react-router';
import { Scan } from 'lucide-react';
import { VisionAnalyzer } from '../components/VisionAnalyzer';
import { VisionChat } from '../components/VisionChat';
import type { VisionResult } from '../lib/api';

export function VisionPage() {
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 space-y-6">

      {/* ── Page Header ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: 'var(--gs-faint)' }}>
          <Scan className="size-3.5" style={{ color: 'var(--gs-accent)' }} />
          <span style={{ color: 'var(--gs-accent)' }}>Computer Vision</span>
          <span>/</span>
          <span>Screenshot Analyzer</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--gs-text)' }}>
          Game Screenshot Analyzer
        </h1>
        <p className="text-sm" style={{ color: 'var(--gs-faint)' }}>
          Upload any game screenshot — the AI will identify the item, rank, or account details, then you can chat with it about anything in the image.
        </p>
      </div>

      {/* ── Info strip ── */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs px-4 py-3 rounded-xl border"
        style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}
      >
        <span style={{ color: 'var(--gs-faint)' }}>
          <span className="font-semibold" style={{ color: 'var(--gs-muted)' }}>Model: </span>
          llama-4-scout-17b
        </span>
        <span style={{ color: 'var(--gs-faint)' }}>
          <span className="font-semibold" style={{ color: 'var(--gs-muted)' }}>Supports: </span>
          CS2 · Valorant · LoL · Apex · PUBG · Fortnite
        </span>
        <span style={{ color: 'var(--gs-faint)' }}>
          <span className="font-semibold" style={{ color: 'var(--gs-muted)' }}>Max size: </span>
          10 MB
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span style={{ color: 'var(--gs-faint)' }}>AI Online</span>
        </span>
      </div>

      {/* ── Two-column: Analyzer + Chat ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Left — Upload + Analysis */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gs-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>Upload Screenshot</h2>
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>PNG, JPG, WEBP accepted</p>
          </div>
          <div className="p-5">
            <VisionAnalyzer
              showUseButton={false}
              onUseData={setVisionResult}
              onResult={setVisionResult}
            />
          </div>
        </div>

        {/* Right — AI Chat */}
        <VisionChat visionResult={visionResult} />
      </div>

      {/* ── How it works ── */}
      <div
        className="rounded-2xl border"
        style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--gs-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>How it works</h2>
        </div>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--gs-border)' }}>
          {[
            { n: '1', title: 'Upload',   body: 'Drag and drop or click to select any gaming screenshot from your device.' },
            { n: '2', title: 'Analyze',  body: 'The AI vision model reads the image and extracts structured game data.' },
            { n: '3', title: 'Chat',     body: 'Ask the AI anything about the screenshot — price, trade tips, rank info and more.' },
          ].map(step => (
            <div key={step.n} className="px-6 py-5 flex gap-4">
              <span
                className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                style={{ background: 'rgba(26,111,212,0.15)', color: 'var(--gs-accent)' }}
              >
                {step.n}
              </span>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--gs-text)' }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--gs-faint)' }}>{step.body}</p>
              </div>
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
