import { useCallback, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';
import { getCroppedImg } from '../lib/cropImage';
import { useT } from '../lib/i18n';

interface AvatarCropModalProps {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onComplete: (croppedDataUrl: string) => void;
}

export function AvatarCropModal({ imageSrc, open, onClose, onComplete }: AvatarCropModalProps) {
  const t = useT();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);
  const croppedPixelsRef = useRef<Area | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    croppedPixelsRef.current = pixels;
  }, []);

  const handleApply = async () => {
    if (!croppedPixelsRef.current) return;
    setProcessing(true);
    try {
      const result = await getCroppedImg(imageSrc, croppedPixelsRef.current, rotation);
      if (result) onComplete(result);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{ background: '#1a1a2e' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">{t('settings.crop.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Crop viewport */}
        <div className="relative w-full" style={{ height: 340 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
          <ZoomOut className="size-4 text-white/50 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 h-1 accent-[var(--gs-accent)] cursor-pointer"
            aria-label={t('settings.crop.zoom')}
          />
          <ZoomIn className="size-4 text-white/50 shrink-0" />
          <button
            type="button"
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="ml-1 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={t('settings.crop.rotate')}
            aria-label={t('settings.crop.rotate')}
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--gs-accent)' }}
          >
            {processing && <Loader2 className="size-3.5 animate-spin" />}
            {t('settings.crop.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
