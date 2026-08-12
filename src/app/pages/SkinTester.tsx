import { lazy, Suspense, useEffect, useRef, useState, type ButtonHTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Check, ChevronDown, Crosshair, Eye, EyeOff, Hand, Lock, Orbit,
  RotateCcw, ScanLine, Search, Settings2, ShoppingCart, Sparkles, Undo2,
  SlidersHorizontal, Users, X,
} from 'lucide-react';
import {
  apiSearchCs2Skins,
  apiSearchCs2Gloves,
  apiSearchCs2Charms,
  apiSearchCs2Stickers,
  apiListCs2Weapons,
  type Cs2SkinVisual,
  type Cs2AttachItem,
} from '../lib/api';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  FPS_VIEWMODEL_DEFAULTS,
  FPS_VIEWMODEL_LIMITS,
  type FpsViewmodelTransform,
  type WeaponAnimAction,
} from '../components/weaponViewerTypes';
import {
  DEFAULT_VIEWMODEL_ARM_ID,
  getViewmodelArmAsset,
  VIEWMODEL_ARM_ASSETS,
} from '../lib/viewmodelArms';

// Keep the rendering runtime out of the initial application bundle.
const WeaponViewerBabylon = lazy(() => import('../components/WeaponViewerBabylon').then(module => ({
  default: module.WeaponViewerBabylon,
})));

const MAP_CATALOG = [
  { id: 'warehouse', label: 'Warehouse' },
  { id: 'ancient', label: 'Ancient' },
  { id: 'ancient-night', label: 'Ancient Night' },
  { id: 'anubis', label: 'Anubis' },
  { id: 'baggage', label: 'Baggage' },
  { id: 'cache', label: 'Cache' },
  { id: 'dust-ii', label: 'Dust II' },
  { id: 'inferno', label: 'Inferno' },
  { id: 'italy', label: 'Italy' },
  { id: 'mirage', label: 'Mirage' },
  { id: 'nuke', label: 'Nuke' },
  { id: 'office', label: 'Office' },
  { id: 'overpass', label: 'Overpass' },
  { id: 'train', label: 'Train' },
  { id: 'vertigo', label: 'Vertigo', image: '/cs2-viewmodels/backgrounds/vertigo.png' },
] as const;
type MapId = (typeof MAP_CATALOG)[number]['id'];
const RATIOS = ['16:9', '16:10', '4:3', '5:4'] as const;
const DEFAULT_SKIN = 'AK-47 | Default (Vanilla)';
const USE_LOCAL_3D = true; // POC: local GLB from public/cs2-viewmodels/ak47
const DEFAULT_WEAPON_IMAGES: Record<string, string> = {
  'AK-47': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnh9nYMoaCvMfxudKGVC2bIwLku5bFsHn2xzU1w4W_Tm9-ucn2eaQZxWcYmR-IU8k7vea-fOvM',
  'M4A4': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKntqSMK0OGnZKFjI_WBQD_Cleh0teA_F37qkERy52rWm9yhdynGblMgD5AkQrZeuhXtkt3iMOv8p1uJZpwq8Vo',
  'M4A1-S': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKntqSMK0OGnZKFjI_WBQD_Cleh0teA_F37qkERy52rWm9yhdynGblMgD5AkQrZeuhXtkt3iMOv8p1uJZpwq8Vo',
  'AWP': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKn17jJk_PuibapuJeLdWGLFwL8i4eVsFiqxxUt34jmHnoysJ3qVOAYgCJZwQrRb5EPul4XlYvSiuVIHgy4Xvg',
  'Bayonet': 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKni_DtU4fe6Jv07IfTDDT_JkL4htLI7HCvmwE9z42_Vzov4ci2Wa1IgWMN3R7IMuxCm0oqwYUAZNBA',
};

type PanelKey = 'weapon' | 'attachments' | 'gloves' | 'agent' | 'settings';
type PickerKind = 'weapon' | 'gloves' | 'charms' | 'stickers' | null;
type AttachItem = { name: string; image: string | null };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function floatToWearOpacity(f: number) {
  if (!Number.isFinite(f)) return 0.12;
  return clamp(0.05 + f * 0.9, 0.05, 0.72);
}

function skinPaintName(full: string) {
  const parts = full.split('|');
  return (parts[1] || parts[0] || full).trim();
}

function ViewerLoadOverlay({
  label,
  error,
  onRetry,
}: {
  label: string;
  error: string | null;
  onRetry: () => void;
}) {
  const failed = Boolean(error);
  return (
    <div
      className={`stv-viewer-load-state ${failed ? 'is-error' : ''}`}
      role={failed ? 'alert' : 'status'}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="stv-viewer-load-panel">
        <div className="stv-viewer-load-heading">
          {failed ? <X className="size-4" aria-hidden="true" /> : <RotateCcw className="stv-viewer-load-spinner size-4" aria-hidden="true" />}
          <strong>{failed ? 'Preview unavailable' : label}</strong>
        </div>
        <p>{failed ? error : 'Preparing the model and applying its materials.'}</p>
        {failed ? (
          <button type="button" className="stv-viewer-retry" onClick={onRetry}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Try again
          </button>
        ) : (
          <div className="stv-viewer-load-track" aria-hidden="true"><span /></div>
        )}
      </div>
    </div>
  );
}

function PanelShell({
  num, title, summary, open, onToggle, children, icon,
}: {
  num: number; title: string; summary?: string; open: boolean;
  onToggle: () => void; children: ReactNode; icon: ReactNode;
}) {
  return (
    <section className="stv-panel">
      <button type="button" className="stv-panel-head" onClick={onToggle} aria-expanded={open}>
        <span className="stv-panel-num" aria-hidden="true">{num}</span>
        <span className="stv-panel-icon" aria-hidden="true">{icon}</span>
        <span className="stv-panel-title">{title}</span>
        {summary ? <span className="stv-panel-summary">{summary}</span> : null}
        <ChevronDown
          className="size-3.5 text-[var(--stv-faint)] shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>
      {open ? <div className="stv-panel-body">{children}</div> : null}
    </section>
  );
}

function ToolButton({
  label, shortcut, icon, active = false, className = '', children, ...props
}: {
  label: string;
  shortcut?: string;
  icon: ReactNode;
  active?: boolean;
  className?: string;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`stv-tool ${active ? 'is-active' : ''} ${className}`}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      aria-label={label}
      {...props}
    >
      {shortcut ? <kbd className="stv-tool-key">{shortcut}</kbd> : null}
      <span className="stv-tool-icon" aria-hidden="true">{icon}</span>
      <span className="stv-tool-label">{children || label}</span>
    </button>
  );
}

function LiveSlider({
  label, value, display, min, max, step, disabled = false, onChange,
}: {
  label: string; value: number; display: string;
  min: number; max: number; step: number; disabled?: boolean; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`stv-prop ${disabled ? 'opacity-65 pointer-events-none' : ''}`}>
      <div className="stv-prop-top">
        <span>{label} {disabled ? '(Locked)' : ''}</span>
        <span>{display}</span>
      </div>
      <input
        className="stv-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => !disabled && onChange(parseFloat(e.target.value))}
        style={{
          background: `linear-gradient(90deg, rgba(232,122,46,0.65) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
        }}
      />
    </div>
  );
}

function formatTransformNumber(value: number, precision: number) {
  return (Math.abs(value) < 10 ** -precision / 2 ? 0 : value).toFixed(precision);
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }
  if (!(target instanceof HTMLInputElement)) return false;
  // Range controls keep keyboard focus after a viewmodel adjustment. They
  // should not disable F/R/C/Space weapon shortcuts like a text field does.
  return !['range', 'button', 'checkbox', 'radio'].includes(target.type);
}

import { type StoreListingAPI } from '../lib/api';

export type SkinTesterProps = {
  testListing?: StoreListingAPI | null;
  onClose?: () => void;
  onBuy?: (listing: StoreListingAPI) => void;
};

export function SkinTester({ testListing, onClose, onBuy }: SkinTesterProps = {}) {
  const navigate = useNavigate();
  const isTestMode = Boolean(testListing);

  const [skinName, setSkinName] = useState(testListing?.item || DEFAULT_SKIN);
  const [skinImage, setSkinImage] = useState<string | null>(testListing?.image || null);
  const [weaponLabel, setWeaponLabel] = useState('AK-47');
  const [floatVal, setFloatVal] = useState<number>(() => {
    if (testListing?.float) {
      const f = parseFloat(String(testListing.float));
      return Number.isFinite(f) ? f : 0.0;
    }
    return 0.0;
  });
  const [pattern, setPattern] = useState<number>(() => {
    if (testListing?.pattern) {
      const p = parseInt(String(testListing.pattern), 10);
      return Number.isFinite(p) ? p : 1;
    }
    return 1;
  });
  const [use3D, setUse3D] = useState(USE_LOCAL_3D);
  const [weaponSlug, setWeaponSlug] = useState('ak47');
  const [viewMode3D, setViewMode3D] = useState<'inspect' | 'fps'>('inspect');
  const [isSpraying, setIsSpraying] = useState(false);
  const [stattrak, setStatTrak] = useState(false);
  const [statCount, setStatCount] = useState(0);
  const [nametag, setNametag] = useState('');
  const [stickers, setStickers] = useState<AttachItem[]>([]);
  const [charms, setCharms] = useState<AttachItem[]>([]);
  const [glovesName, setGlovesName] = useState<string | null>('Hand Wraps | Arboreal');
  const [glovesImage, setGlovesImage] = useState<string | null>(null);
  const [glovesFloat, setGlovesFloat] = useState(0.0);
  const [glovesPattern, setGlovesPattern] = useState(1);
  const [selectedArmId, setSelectedArmId] = useState(DEFAULT_VIEWMODEL_ARM_ID);

  const [map, setMap] = useState<MapId>('vertigo');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [volume, setVolume] = useState(50);
  const [fov, setFov] = useState(FPS_VIEWMODEL_DEFAULTS.fov);
  const [offsetX, setOffsetX] = useState(FPS_VIEWMODEL_DEFAULTS.offsetX);
  const [offsetY, setOffsetY] = useState(FPS_VIEWMODEL_DEFAULTS.offsetY);
  const [offsetZ, setOffsetZ] = useState(FPS_VIEWMODEL_DEFAULTS.offsetZ);
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>('16:9');

  const [uiHidden, setUiHidden] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [weaponAction, setWeaponAction] = useState<WeaponAnimAction>('idle');
  const [animationLocked, setAnimationLocked] = useState(false);
  const [actionNonce, setActionNonce] = useState(0);
  const [viewResetNonce, setViewResetNonce] = useState(0);
  const [fpsTransform, setFpsTransform] = useState<FpsViewmodelTransform | null>(null);
  const [viewerLoading, setViewerLoading] = useState(true);
  const [viewerLoadError, setViewerLoadError] = useState<string | null>(null);
  const [viewerLoadReason, setViewerLoadReason] = useState<'model' | 'texture'>('model');
  const [viewerReloadNonce, setViewerReloadNonce] = useState(0);
  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>({
    weapon: true,
    attachments: false,
    gloves: false,
    agent: false,
    settings: false,
  });

  const [picker, setPicker] = useState<PickerKind>(null);
  const [pickerQ, setPickerQ] = useState('');
  const [pickerWeapon, setPickerWeapon] = useState('All');
  const [pickerCategory, setPickerCategory] = useState('All Charms');
  const [weapons, setWeapons] = useState<string[]>([]);
  const [attachCategories, setAttachCategories] = useState<string[]>([]);
  const [pickerItems, setPickerItems] = useState<Array<Cs2SkinVisual | Cs2AttachItem>>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const dragRef = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const firingPointersRef = useRef(new Set<number>());
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // Bootstrap default gloves + weapon list
  useEffect(() => {
    if (testListing) {
      setSkinName(testListing.item);
      setSkinImage(testListing.image || null);
    }
    apiSearchCs2Gloves({ q: 'Arboreal', limit: 1 })
      .then(res => {
        const hit = res.gloves[0];
        if (hit) {
          setGlovesName(hit.name);
          setGlovesImage(hit.image);
        }
      })
      .catch(() => {});
    apiListCs2Weapons().then(r => setWeapons(r.weapons)).catch(() => {});
  }, [testListing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mapPickerOpen) setMapPickerOpen(false);
        else if (picker) setPicker(null);
        else navigate('/store');
      }
      if (e.key.toLowerCase() === 'h' && !picker) setUiHidden(v => !v);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mapPickerOpen, navigate, picker]);

  // Global Keyboard Hotkeys: F (Inspect), R (Reload), C (Draw), Q (Quick Open), H (Hide UI), Space (Shoot/Spray)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextEntryTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'f') {
        e.preventDefault();
        triggerInspect();
      } else if (k === 'r') {
        e.preventDefault();
        playWeaponAction('reload');
      } else if (k === 'c') {
        e.preventDefault();
        playWeaponAction('draw');
      } else if (k === 'q') {
        e.preventDefault();
        setPicker('weapon'); setPickerWeapon('All');
      } else if (k === 'h') {
        e.preventDefault();
        setUiHidden(v => !v);
      } else if (k === ' ' || k === 'e') {
        e.preventDefault();
        if (!animationLocked) setIsSpraying(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'e') {
        setIsSpraying(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [animationLocked, use3D]);

  // Load picker catalogue
  useEffect(() => {
    if (!picker) return;
    let cancelled = false;
    setPickerLoading(true);

    const finish = (items: Array<Cs2SkinVisual | Cs2AttachItem>, categories?: string[]) => {
      if (cancelled) return;
      setPickerItems(items);
      if (categories?.length) setAttachCategories(categories);
    };

    const fail = () => { if (!cancelled) setPickerItems([]); };

    if (picker === 'gloves') {
      apiSearchCs2Gloves({ q: pickerQ, limit: 60 })
        .then(res => finish(res.gloves || []))
        .catch(fail)
        .finally(() => { if (!cancelled) setPickerLoading(false); });
    } else if (picker === 'charms') {
      apiSearchCs2Charms({ q: pickerQ, category: pickerCategory, limit: 80 })
        .then(res => finish(res.charms || [], res.categories))
        .catch(fail)
        .finally(() => { if (!cancelled) setPickerLoading(false); });
    } else if (picker === 'stickers') {
      apiSearchCs2Stickers({ q: pickerQ, category: pickerCategory, limit: 80 })
        .then(res => finish(res.stickers || [], res.categories))
        .catch(fail)
        .finally(() => { if (!cancelled) setPickerLoading(false); });
    } else {
      apiSearchCs2Skins({
        q: pickerQ,
        weapon: pickerWeapon === 'All' ? undefined : pickerWeapon,
        limit: 60,
      })
        .then(res => {
          const list = res.skins || [];
          const targetWeapon = pickerWeapon === 'All' ? 'AK-47' : pickerWeapon;
          const vanillaCard: Cs2SkinVisual = {
            name: `${targetWeapon} | Vanilla (Default)`,
            weapon: targetWeapon,
            category: 'Default Finish',
            image: DEFAULT_WEAPON_IMAGES[targetWeapon] || list[0]?.image || '',
          };
          finish([vanillaCard, ...list]);
        })
        .catch(fail)
        .finally(() => { if (!cancelled) setPickerLoading(false); });
    }

    return () => { cancelled = true; };
  }, [picker, pickerQ, pickerWeapon, pickerCategory]);

  const openAttachPicker = (kind: 'charms' | 'stickers') => {
    setPickerCategory(kind === 'charms' ? 'All Charms' : 'All Stickers');
    setPickerQ('');
    setPicker(kind);
  };

  const togglePanel = (key: PanelKey) =>
    setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));

  const onPointerDown = (e: ReactPointerEvent) => {
    if (use3D || uiHidden || picker) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: drag.x,
      baseY: drag.y,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setDrag({
      x: clamp(dragRef.current.baseX + dx * 0.35, -80, 80),
      y: clamp(dragRef.current.baseY + dy * 0.25, -50, 50),
    });
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
    setDragging(false);
  };

  const onFpsFireDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (animationLocked || viewMode3D !== 'fps' || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    firingPointersRef.current.add(event.pointerId);
    setIsSpraying(true);
  };

  const onFpsFireUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!firingPointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    firingPointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (firingPointersRef.current.size === 0) setIsSpraying(false);
  };

  const playWeaponAction = (next: WeaponAnimAction) => {
    if (animationLocked) return;
    setWeaponAction(next);
    setActionNonce(n => n + 1);
  };

  const triggerInspect = () => {
    if (use3D) {
      playWeaponAction('inspect');
      return;
    }
    if (animationLocked) return;
    setAnimationLocked(true);
    setInspecting(true);
    window.setTimeout(() => {
      setInspecting(false);
      setAnimationLocked(false);
    }, 1400);
  };

  const resetFpsViewmodel = () => {
    setDrag({ x: 0, y: 0 });
    setFov(FPS_VIEWMODEL_DEFAULTS.fov);
    setOffsetX(FPS_VIEWMODEL_DEFAULTS.offsetX);
    setOffsetY(FPS_VIEWMODEL_DEFAULTS.offsetY);
    setOffsetZ(FPS_VIEWMODEL_DEFAULTS.offsetZ);
    setViewResetNonce(value => value + 1);
  };

  const resetView = () => {
    resetFpsViewmodel();
    if (use3D) playWeaponAction('draw');
  };

  const showFirstPersonView = () => {
    // Restore the entire calibrated FPS preset—not only the drag state—so a
    // changed FOV or offset cannot leave the rifle small in the screen corner.
    resetFpsViewmodel();
    firingPointersRef.current.clear();
    setIsSpraying(false);
    setAnimationLocked(false);
    setViewMode3D('fps');
  };

  const beginViewerLoad = (reason: 'model' | 'texture') => {
    setViewerLoadReason(reason);
    setViewerLoadError(null);
    setViewerLoading(true);
  };

  const showThirdPersonView = () => {
    firingPointersRef.current.clear();
    setIsSpraying(false);
    setAnimationLocked(false);
    if (viewMode3D !== 'inspect') beginViewerLoad('model');
    setViewMode3D('inspect');
  };

  const toggle3DView = () => {
    if (!use3D) beginViewerLoad('model');
    setUse3D(value => !value);
  };

  const selectPickerItem = (item: Cs2SkinVisual | Cs2AttachItem) => {
    if (picker === 'gloves') {
      setGlovesName(item.name);
      setGlovesImage(item.image);
    } else if (picker === 'charms') {
      setCharms(prev => [...prev, { name: item.name, image: item.image }]);
      setOpenPanels(p => ({ ...p, attachments: true }));
    } else if (picker === 'stickers') {
      setStickers(prev => [...prev, { name: item.name, image: item.image }]);
      setOpenPanels(p => ({ ...p, attachments: true }));
    } else {
      const skin = item as Cs2SkinVisual;
      beginViewerLoad('texture');
      setViewerReloadNonce(value => value + 1);
      setSkinName(skin.name);
      setWeaponLabel(skin.weapon || weaponLabel);

      const isBayonet = /bayonet/i.test(skin.name) || /bayonet/i.test(skin.weapon || '');
      const isAutoexec = /autoexec/i.test(skin.name);
      const isAutotronic = /autotronic/i.test(skin.name);
      const isVanilla = /default|vanilla/i.test(skin.name);

      if (isBayonet && isAutotronic) {
        setWeaponSlug('bayonet-autotronic');
        setSkinImage(null);
        setUse3D(true);
      } else if (isBayonet) {
        setWeaponSlug('bayonet');
        setSkinImage(skin.image);
        setUse3D(true);
      } else if (isAutoexec) {
        setWeaponSlug('ak-47-autoexec');
        setSkinImage(null);
        setUse3D(true);
      } else if (isVanilla) {
        setWeaponSlug('ak47');
        setSkinImage(null);
        setUse3D(true);
      } else {
        setWeaponSlug('ak47');
        setSkinImage(skin.image);
        setUse3D(true);
      }
    }
    setPicker(null);
    setPickerQ('');
  };

  const wearOpacity = floatToWearOpacity(floatVal);
  const activeCharm = charms[0] || null;
  const activeArm = getViewmodelArmAsset(selectedArmId);
  const activeMap = MAP_CATALOG.find(entry => entry.id === map) ?? MAP_CATALOG[0];

  const pickerTitle =
    picker === 'gloves' ? 'Gloves'
      : picker === 'charms' ? 'Charms'
        : picker === 'stickers' ? 'Stickers'
          : 'Weapons';

  const pickerSearchPlaceholder =
    picker === 'gloves' ? 'Search gloves'
      : picker === 'charms' ? 'Search charms'
        : picker === 'stickers' ? 'Search stickers'
          : 'Search skins';

  const filterList =
    picker === 'weapon' ? ['All', ...weapons.slice(0, 18)]
      : picker === 'gloves' ? ['All Gloves']
        : picker === 'charms' || picker === 'stickers' ? (attachCategories.length ? attachCategories : [pickerCategory])
          : [];

  return (
    <div
      className="stv-root"
      role="application"
      aria-label="Skin Tester"
      style={{
        ['--stv-fov' as string]: String(fov),
        ['--stv-ox' as string]: String(offsetX),
        ['--stv-oy' as string]: String(offsetY),
        ['--stv-oz' as string]: String(offsetZ),
        ['--stv-drag-x' as string]: String(drag.x),
        ['--stv-drag-y' as string]: String(drag.y),
        ['--stv-wear-opacity' as string]: String(wearOpacity),
        ['--stv-ry' as string]: `${-8 + drag.x * 0.2}deg`,
        ['--stv-rx' as string]: `${4 - drag.y * 0.15}deg`,
        ['--stv-aspect-ratio' as string]: ratio.replace(':', ' / '),
      }}
    >
      <div
        className={`stv-viewport ${dragging && !use3D ? 'is-dragging' : ''} ${use3D ? 'is-3d' : ''}`}
        onPointerDown={use3D ? undefined : onPointerDown}
        onPointerMove={use3D ? undefined : onPointerMove}
        onPointerUp={use3D ? undefined : onPointerUp}
        onPointerCancel={use3D ? undefined : onPointerUp}
      >
        <div
          className={`stv-map ${activeMap.image ? 'has-map-art' : ''}`}
          data-map={activeMap.label}
          style={activeMap.image ? { ['--stv-map-image' as string]: `url("${activeMap.image}")` } : undefined}
        />
        <div className="stv-fog" />
        <div className="stv-weapon-stage">
          {use3D ? (
            <div
              className={`stv-3d-host select-none ${viewMode3D === 'inspect' ? 'is-orbit' : 'is-fps'}`}
              aria-busy={viewMode3D === 'inspect' && viewerLoading}
              onPointerDown={viewMode3D === 'fps' ? onFpsFireDown : undefined}
              onPointerUp={viewMode3D === 'fps' ? onFpsFireUp : undefined}
              onPointerCancel={viewMode3D === 'fps' ? onFpsFireUp : undefined}
              onContextMenu={viewMode3D === 'fps' ? event => event.preventDefault() : undefined}
            >
              <Suspense fallback={null}>
              <WeaponViewerBabylon
                key={`${weaponSlug}-${skinName}-${activeArm.id}-${viewMode3D}-${viewerReloadNonce}`}
                weaponSlug={weaponSlug}
                skinImage={skinImage}
                skinName={skinName}
                floatValue={floatVal}
                pattern={pattern}
                fov={fov}
                offsetX={offsetX}
                offsetY={offsetY}
                offsetZ={offsetZ}
                armModelUrl={activeArm.modelUrl}
                armTextureFallbackNames={activeArm.hiddenTexturePrefixes}
                armTransform={activeArm.transform}
                usesSharedWeaponRig={activeArm.usesSharedWeaponRig}
                viewMode={viewMode3D}
                volume={volume}
                isSpraying={isSpraying}
                action={weaponAction}
                actionNonce={actionNonce}
                viewResetNonce={viewResetNonce}
                onFpsTransformChange={setFpsTransform}
                onActionLockChange={setAnimationLocked}
                onLoadStateChange={loading => {
                  setViewerLoading(loading);
                  if (loading) setViewerLoadError(null);
                }}
                onLoadError={setViewerLoadError}
                className="stv-3d-canvas"
              />
              </Suspense>
              {viewMode3D === 'inspect' && (viewerLoading || viewerLoadError) ? (
                <ViewerLoadOverlay
                  label={viewerLoadReason === 'texture' ? `Applying ${skinPaintName(skinName)}` : 'Loading 3D weapon'}
                  error={viewerLoadError}
                  onRetry={() => {
                    beginViewerLoad(viewerLoadReason);
                    setViewerReloadNonce(value => value + 1);
                  }}
                />
              ) : null}
            </div>
          ) : (
            <div style={{ position: 'relative', transformStyle: 'preserve-3d' }}>
              <ImageWithFallback
                src={skinImage || ''}
                alt={skinName}
                className={`stv-weapon ${inspecting ? 'is-inspecting' : ''}`}
                draggable={false}
              />
              <div className="stv-wear-overlay" aria-hidden />
              {activeCharm?.image && (
                <div className="stv-charm-overlay" aria-hidden>
                  <ImageWithFallback src={activeCharm.image} alt={activeCharm.name} className="stv-charm-img" />
                </div>
              )}
            </div>
          )}
        </div>
        {use3D && !uiHidden ? (
          <>
            {viewMode3D === 'fps' && fpsTransform ? (
              <div
                className="stv-transform-readout"
                aria-label={`Viewmodel position X ${formatTransformNumber(fpsTransform.position[0], 3)}, Y ${formatTransformNumber(fpsTransform.position[1], 3)}, Z ${formatTransformNumber(fpsTransform.position[2], 3)}; rotation X ${formatTransformNumber(fpsTransform.rotationDegrees[0], 1)} degrees, Y ${formatTransformNumber(fpsTransform.rotationDegrees[1], 1)} degrees, Z ${formatTransformNumber(fpsTransform.rotationDegrees[2], 1)} degrees`}
              >
                <div className="stv-transform-row">
                  <span className="stv-transform-label">Position</span>
                  {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                    <span className="stv-transform-value" key={axis}>
                      <b>{axis}</b> {formatTransformNumber(fpsTransform.position[index], 3)}
                    </span>
                  ))}
                </div>
                <div className="stv-transform-row">
                  <span className="stv-transform-label">Rotation</span>
                  {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                    <span className="stv-transform-value" key={axis}>
                      <b>{axis}</b> {formatTransformNumber(fpsTransform.rotationDegrees[index], 1)}°
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <header className="stv-topbar">
        <div className="stv-brand-lockup">
          <div className="stv-brand-mark" aria-hidden="true">S1</div>
          <div className="stv-logo"><span>S1zz</span>Skin</div>
          {isTestMode && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
              🔒 Listing Test Mode
            </span>
          )}
        </div>
        {!uiHidden && (
          <div className="stv-actions">
            {isTestMode && testListing && (
              <ToolButton
                label="Buy this item"
                icon={<ShoppingCart className="size-3.5" />}
                className="stv-tool-buy"
                onClick={() => onBuy ? onBuy(testListing) : navigate('/cart')}
              >
                Buy ${testListing.price.toLocaleString()}
              </ToolButton>
            )}
            <ToolButton label="Quick open" shortcut="Q" icon={<Search className="size-3.5" />} onClick={() => { setPicker('weapon'); setPickerWeapon('All'); }} />
            <ToolButton label="Hide UI" shortcut="H" icon={<EyeOff className="size-3.5" />} onClick={() => setUiHidden(true)} />
            <ToolButton label="Inspect" shortcut="F" icon={<ScanLine className="size-3.5" />} disabled={animationLocked} onClick={triggerInspect} />
            {use3D && (
              <>
                <ToolButton
                  label="Shoot"
                  shortcut="LMB/RMB"
                  icon={<Crosshair className="size-3.5" />}
                  active={isSpraying}
                  disabled={animationLocked && !isSpraying}
                  onMouseDown={() => { if (!animationLocked) setIsSpraying(true); }}
                  onMouseUp={() => setIsSpraying(false)}
                  onMouseLeave={() => setIsSpraying(false)}
                />
                <ToolButton label="Reload" shortcut="R" icon={<RotateCcw className="size-3.5" />} disabled={animationLocked} onClick={() => playWeaponAction('reload')} />
                <ToolButton label="Draw" shortcut="C" icon={<Hand className="size-3.5" />} disabled={animationLocked} onClick={() => playWeaponAction('draw')} />
              </>
            )}
            <ToolButton label="Reset view" icon={<Undo2 className="size-3.5" />} onClick={resetView} />
            <ToolButton label={use3D ? '3D local' : '2D image'} icon={<Box className="size-3.5" />} active={use3D} onClick={toggle3DView} />
            {use3D && (
              <div className="stv-view-switch" role="group" aria-label="View mode">
                <ToolButton
                  label="First person"
                  icon={<Eye className="size-3.5" />}
                  active={viewMode3D === 'fps'}
                  aria-pressed={viewMode3D === 'fps'}
                  onClick={showFirstPersonView}
                >1P</ToolButton>
                <ToolButton
                  label="Orbit view"
                  icon={<Orbit className="size-3.5" />}
                  active={viewMode3D === 'inspect'}
                  aria-pressed={viewMode3D === 'inspect'}
                  onClick={showThirdPersonView}
                >3P</ToolButton>
              </div>
            )}
          </div>
        )}
        <div className="stv-top-right">
          <button
            type="button"
            className={`stv-icon-btn stv-mobile-controls-toggle ${mobileControlsOpen ? 'is-active' : ''}`}
            onClick={() => setMobileControlsOpen(open => !open)}
            aria-label={mobileControlsOpen ? 'Close controls' : 'Open controls'}
            aria-expanded={mobileControlsOpen}
            title={mobileControlsOpen ? 'Close controls' : 'Open controls'}
          >
            <SlidersHorizontal className="size-4" />
          </button>
          <button
            type="button"
            className="stv-icon-btn"
            onClick={() => onClose ? onClose() : navigate('/store')}
            aria-label="Close Test Mode"
            title="Close Test Mode"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {!uiHidden && (
        <>
          <button
            type="button"
            className={`stv-mobile-backdrop ${mobileControlsOpen ? 'is-visible' : ''}`}
            onClick={() => setMobileControlsOpen(false)}
            aria-label="Close controls"
            tabIndex={mobileControlsOpen ? 0 : -1}
          />
          <aside className={`stv-sidebar ${mobileControlsOpen ? 'is-mobile-open' : ''}`}>
            <PanelShell
              num={1}
              title="Weapon"
              icon={<Crosshair className="size-3.5" />}
              summary={skinName}
              open={openPanels.weapon}
              onToggle={() => togglePanel('weapon')}
            >
              <button
                type="button"
                className="stv-locked-row"
                style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setPicker('weapon')}
              >
                <span className="stv-locked-label">Change</span>
                <span className="stv-locked-name">{skinName}</span>
              </button>
              <p className="stv-section-label">Properties</p>
              {isTestMode && (
                <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200 leading-snug space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Lock className="size-3.5 text-amber-400 shrink-0" /> Float & Pattern Locked
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Locked to match seller's listing (Float {floatVal.toFixed(4)} · Seed #{pattern}).
                  </p>
                </div>
              )}
              <LiveSlider
                label="Wear"
                value={floatVal}
                display={floatVal.toFixed(4)}
                min={0}
                max={1}
                step={0.0001}
                disabled={isTestMode}
                onChange={setFloatVal}
              />
              <LiveSlider
                label="Pattern"
                value={pattern}
                display={String(Math.round(pattern))}
                min={0}
                max={999}
                step={1}
                disabled={isTestMode}
                onChange={v => setPattern(Math.round(v))}
              />
              <div className="stv-toggle-row">
                <span className="text-sm font-semibold">StatTrak™</span>
                <button
                  type="button"
                  className={`stv-pill ${stattrak ? '' : 'off'}`}
                  onClick={() => setStatTrak(v => !v)}
                >
                  {stattrak ? 'On' : 'Off'}
                </button>
              </div>
              {stattrak && (
                <LiveSlider
                  label="StatTrak™ kills"
                  value={statCount}
                  display={String(Math.round(statCount))}
                  min={0}
                  max={999999}
                  step={1}
                  onChange={v => setStatCount(Math.round(v))}
                />
              )}
              <div className="stv-prop">
                <div className="stv-prop-top">
                  <span>Nametag</span>
                  <span>{nametag || 'None'}</span>
                </div>
                <input
                  value={nametag}
                  onChange={e => setNametag(e.target.value)}
                  placeholder="Optional nametag"
                  className="w-full mt-2 bg-transparent border border-[var(--stv-border)] rounded-lg px-3 py-2 text-sm text-[var(--stv-text)] placeholder:text-[var(--stv-faint)] focus:outline-none"
                />
              </div>
            </PanelShell>

            <PanelShell
              num={2}
              title="Attachments"
              icon={<Sparkles className="size-3.5" />}
              summary={
                stickers.length || charms.length
                  ? `${stickers.length} sticker${stickers.length === 1 ? '' : 's'} · ${charms.length} charm${charms.length === 1 ? '' : 's'}`
                  : 'Empty'
              }
              open={openPanels.attachments}
              onToggle={() => togglePanel('attachments')}
            >
              <button type="button" className="stv-map-btn" style={{ width: '100%' }} onClick={() => openAttachPicker('charms')}>
                + Add Charm
              </button>
              <button type="button" className="stv-map-btn" style={{ width: '100%' }} onClick={() => openAttachPicker('stickers')}>
                + Add Sticker
              </button>
              {(stickers.length > 0 || charms.length > 0) && (
                <div className="stv-attach-list">
                  {charms.map((c, i) => (
                    <button
                      key={`c-${i}-${c.name}`}
                      type="button"
                      className="stv-attach-item stv-attach-row text-left"
                      onClick={() => setCharms(prev => prev.filter((_, idx) => idx !== i))}
                      title="Click to remove"
                    >
                      <span className="stv-attach-thumb">
                        <ImageWithFallback src={c.image || ''} alt="" className="w-full h-full object-contain" />
                      </span>
                      <span className="min-w-0 truncate">Charm · {skinPaintName(c.name)}</span>
                    </button>
                  ))}
                  {stickers.map((s, i) => (
                    <button
                      key={`s-${i}-${s.name}`}
                      type="button"
                      className="stv-attach-item stv-attach-row text-left"
                      onClick={() => setStickers(prev => prev.filter((_, idx) => idx !== i))}
                      title="Click to remove"
                    >
                      <span className="stv-attach-thumb">
                        <ImageWithFallback src={s.image || ''} alt="" className="w-full h-full object-contain" />
                      </span>
                      <span className="min-w-0 truncate">Sticker · {skinPaintName(s.name)}</span>
                    </button>
                  ))}
                </div>
              )}
            </PanelShell>

            <PanelShell
              num={3}
              title="Gloves"
              icon={<Hand className="size-3.5" />}
              summary={glovesName || 'None'}
              open={openPanels.gloves}
              onToggle={() => togglePanel('gloves')}
            >
              <button
                type="button"
                className="stv-locked-row"
                style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setPicker('gloves')}
              >
                <span className="stv-locked-label">
                  <Hand className="size-3 inline mr-1" />
                  Change
                </span>
                <span className="stv-locked-name">{glovesName || 'Select gloves'}</span>
              </button>
              {glovesName && (
                <>
                  <LiveSlider
                    label="Wear"
                    value={glovesFloat}
                    display={glovesFloat.toFixed(4)}
                    min={0}
                    max={1}
                    step={0.0001}
                    onChange={setGlovesFloat}
                  />
                  <LiveSlider
                    label="Pattern"
                    value={glovesPattern}
                    display={String(Math.round(glovesPattern))}
                    min={0}
                    max={999}
                    step={1}
                    onChange={v => setGlovesPattern(Math.round(v))}
                  />
                  {glovesImage && (
                    <div className="rounded-lg overflow-hidden border border-[var(--stv-border)] bg-black/30 p-2">
                      <ImageWithFallback src={glovesImage} alt={glovesName} className="w-full h-20 object-contain" />
                    </div>
                  )}
                  <button
                    type="button"
                    className="stv-map-btn"
                    onClick={() => { setGlovesName(null); setGlovesImage(null); }}
                  >
                    Clear gloves
                  </button>
                </>
              )}
            </PanelShell>

            <PanelShell
              num={4}
              title="Agent"
              icon={<Users className="size-3.5" />}
              summary={activeArm.label}
              open={openPanels.agent}
              onToggle={() => togglePanel('agent')}
            >
              <p className="stv-section-label">Viewmodel arms</p>
              <div className="stv-agent-list" role="radiogroup" aria-label="Viewmodel agent">
                {VIEWMODEL_ARM_ASSETS.map(agent => (
                  <button
                    key={agent.id}
                    type="button"
                    role="radio"
                    aria-checked={agent.id === activeArm.id}
                    className={`stv-agent-option ${agent.id === activeArm.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedArmId(agent.id)}
                  >
                    <span className="stv-agent-copy">
                      <span className="stv-agent-name">{agent.label}</span>
                      <span className="stv-agent-detail">{agent.detail}</span>
                    </span>
                    <span className="stv-agent-team">{agent.team}</span>
                  </button>
                ))}
              </div>
              <p className="stv-agent-hint">
                Add another exported arm folder to the registry to make it selectable here.
              </p>
            </PanelShell>

            <PanelShell
              num={5}
              title="Settings"
              icon={<Settings2 className="size-3.5" />}
              summary={activeMap.label}
              open={openPanels.settings}
              onToggle={() => togglePanel('settings')}
            >
              <p className="stv-section-label">Map</p>
              <button
                type="button"
                className="stv-map-change"
                onClick={() => setMapPickerOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={mapPickerOpen}
              >
                <span className="stv-map-change-label">Change</span>
                <strong>{activeMap.label}</strong>
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>
              <p className="stv-section-label">Audio</p>
              <LiveSlider label="Volume" value={volume} display={String(Math.round(volume))} min={0} max={100} step={1} onChange={setVolume} />
              <p className="stv-section-label">Viewmodel</p>
              <LiveSlider label="FOV" value={fov} display={String(Math.round(fov))} min={54} max={90} step={1} onChange={setFov} />
              <LiveSlider label="Offset X" value={offsetX} display={offsetX.toFixed(1)} min={FPS_VIEWMODEL_LIMITS.offsetX.min} max={FPS_VIEWMODEL_LIMITS.offsetX.max} step={0.1} onChange={setOffsetX} />
              <LiveSlider label="Offset Y" value={offsetY} display={offsetY.toFixed(1)} min={FPS_VIEWMODEL_LIMITS.offsetY.min} max={FPS_VIEWMODEL_LIMITS.offsetY.max} step={0.1} onChange={setOffsetY} />
              <LiveSlider label="Offset Z" value={offsetZ} display={offsetZ.toFixed(1)} min={FPS_VIEWMODEL_LIMITS.offsetZ.min} max={FPS_VIEWMODEL_LIMITS.offsetZ.max} step={0.1} onChange={setOffsetZ} />
              <p className="stv-section-label">Aspect ratio</p>
              <div className="stv-ratio-row">
                {RATIOS.map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`stv-ratio-btn ${ratio === r ? 'is-active' : ''}`}
                    onClick={() => setRatio(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </PanelShell>
          </aside>

          <div className="stv-footer-cta">
            <div className="stv-price-line">
              <span>{weaponLabel}</span>
              <strong style={{ fontSize: '0.95rem' }}>{skinPaintName(skinName)}</strong>
            </div>
            <button type="button" className="stv-back" onClick={() => navigate('/store')}>
              Back to Trade Vault
            </button>
          </div>
        </>
      )}

      {uiHidden && (
        <button
          type="button"
          className="stv-chip"
          style={{ position: 'absolute', bottom: 20, left: 16, zIndex: 6 }}
          onClick={() => setUiHidden(false)}
        >
          Show UI
        </button>
      )}

      {mapPickerOpen && (
        <div className="stv-map-picker" role="dialog" aria-modal="true" aria-label="Choose map background">
          <button
            type="button"
            className="stv-map-picker-scrim"
            onClick={() => setMapPickerOpen(false)}
            aria-label="Close map picker"
          />
          <section className="stv-map-picker-panel">
            <header className="stv-map-picker-head">
              <div>
                <p className="stv-picker-kicker">Map background</p>
                <h2 className="stv-map-picker-title">Choose a scene</h2>
              </div>
              <button type="button" className="stv-icon-btn" onClick={() => setMapPickerOpen(false)} aria-label="Close map picker">
                <X className="size-4" />
              </button>
            </header>
            <div className="stv-map-card-grid" aria-label="Available map backgrounds">
              {MAP_CATALOG.map(entry => {
                const selected = entry.id === activeMap.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`stv-map-card ${selected ? 'is-active' : ''} ${entry.image ? 'has-art' : ''}`}
                    data-map-card={entry.id}
                    style={entry.image ? { ['--stv-map-card-image' as string]: `url("${entry.image}")` } : undefined}
                    onClick={() => {
                      setMap(entry.id);
                      setMapPickerOpen(false);
                    }}
                    aria-pressed={selected}
                  >
                    <span className="stv-map-card-preview" aria-hidden="true" />
                    <span className="stv-map-card-footer">
                      <span>{entry.label}</span>
                      {selected ? <Check className="size-3.5" aria-label="Selected" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {picker && (
        <div className="stv-picker" role="dialog" aria-modal="true" aria-label={`Select ${pickerTitle}`}>
          <div className="stv-picker-panel">
            <div className="stv-picker-head">
              <div>
                <p className="stv-picker-kicker">Filter by</p>
                <h2 className="stv-picker-title">{pickerTitle}</h2>
              </div>
              <button type="button" className="stv-icon-btn" onClick={() => setPicker(null)} aria-label="Close picker">
                <X className="size-4" />
              </button>
            </div>

            {filterList.length > 0 && (
              <div className="stv-picker-filters">
                {filterList.map(label => {
                  const active = picker === 'weapon'
                    ? pickerWeapon === label || (label === 'All' && pickerWeapon === 'All')
                    : pickerCategory === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`stv-filter-link ${active ? 'is-active' : ''}`}
                      onClick={() => {
                        if (picker === 'weapon') setPickerWeapon(label === 'All' ? 'All' : label);
                        else setPickerCategory(label);
                      }}
                    >
                      {label === 'All' ? 'All items' : label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="stv-picker-search">
              <Search className="size-4 text-[var(--stv-faint)]" />
              <input
                value={pickerQ}
                onChange={e => setPickerQ(e.target.value)}
                placeholder={pickerSearchPlaceholder}
                autoFocus
              />
              <kbd>ESC</kbd>
            </div>

            <div className="stv-picker-grid">
              {pickerLoading && <p className="stv-empty col-span-full">Loading catalogue…</p>}
              {!pickerLoading && pickerItems.length === 0 && (
                <p className="stv-empty col-span-full">No items match your search</p>
              )}
              {pickerItems.map(item => {
                const selected =
                  picker === 'gloves' ? glovesName === item.name
                    : picker === 'weapon' ? skinName === item.name
                      : false;
                const cat =
                  'weapon' in item && item.weapon
                    ? item.weapon
                    : ('category' in item ? item.category : '') || '';
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`stv-pick-card ${selected ? 'is-selected' : ''}`}
                    onClick={() => selectPickerItem(item)}
                  >
                    <div className="stv-pick-art">
                      <ImageWithFallback src={item.image || ''} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    {cat ? <p className="stv-pick-cat">{cat}</p> : null}
                    <p className="stv-pick-name">{skinPaintName(item.name)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
