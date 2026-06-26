import { useState, useRef, useEffect } from 'react';
import type { FC, CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  SlidersHorizontal, User, Bell,
  ChevronRight, Check, Monitor, Sun, Moon,
  Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Camera,
} from 'lucide-react';
import { useAppSettings, ACCENT_MAP, type AccentKey, type ColorMode, type AppLanguage } from '../lib/AppContext';
import { getUser, apiUpdateProfile, apiGetNotificationPrefs, apiUpdateNotificationPrefs, type NotificationPrefs } from '../lib/api';
import { useT } from '../lib/i18n';
import { AvatarCropModal } from '../components/AvatarCropModal';

type Section = 'appearance' | 'language' | 'preferences' | 'account' | 'notifications';

const ACCENT_KEYS: AccentKey[] = ['blue','neutral','violet','green','orange','red','rose','indigo','yellow'];

const COLOR_MODE_LIST: { mode: ColorMode; modeKey: 'light'|'auto'|'dark'; Icon: FC<{ className?: string; style?: CSSProperties }> }[] = [
  { mode: 'light', modeKey: 'light', Icon: Sun     },
  { mode: 'auto',  modeKey: 'auto',  Icon: Monitor },
  { mode: 'dark',  modeKey: 'dark',  Icon: Moon    },
];

/* ── Colour-mode preview mini-mockups ─────────────────────────────────── */
function LightPreview() {
  return (
    <div className="w-full h-full bg-[#f5f5f7] flex flex-col p-1.5 gap-1">
      <div className="flex gap-1 items-center">
        <div className="w-3 h-3 rounded bg-gray-300" />
        <div className="flex-1 h-1.5 rounded bg-gray-200" />
      </div>
      <div className="flex gap-1 flex-1">
        <div className="w-6 bg-gray-200 rounded" />
        <div className="flex-1 bg-white rounded shadow-sm" />
      </div>
    </div>
  );
}
function DarkPreview() {
  return (
    <div className="w-full h-full flex flex-col p-1.5 gap-1" style={{ background: '#0d0b1a' }}>
      <div className="flex gap-1 items-center">
        <div className="w-3 h-3 rounded" style={{ background: '#1f1b35' }} />
        <div className="flex-1 h-1.5 rounded" style={{ background: '#1a1730' }} />
      </div>
      <div className="flex gap-1 flex-1">
        <div className="w-6 rounded" style={{ background: '#131120' }} />
        <div className="flex-1 rounded" style={{ background: '#07060e' }} />
      </div>
    </div>
  );
}
function AutoPreview() {
  return (
    <div className="w-full h-full flex overflow-hidden rounded-xl">
      <div className="w-1/2 bg-[#f5f5f7] flex flex-col p-1 gap-0.5">
        <div className="h-1.5 rounded bg-gray-300 w-3/4" />
        <div className="flex-1 rounded bg-white" />
      </div>
      <div className="w-1/2 flex flex-col p-1 gap-0.5" style={{ background: '#0d0b1a' }}>
        <div className="h-1.5 rounded w-3/4" style={{ background: '#1f1b35' }} />
        <div className="flex-1 rounded" style={{ background: '#131120' }} />
      </div>
    </div>
  );
}
const PREVIEWS: Record<ColorMode, FC> = {
  light: LightPreview,
  auto:  AutoPreview,
  dark:  DarkPreview,
};

/* ── Toggle switch ────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative inline-flex items-center w-10 h-5 rounded-full focus:outline-none focus:ring-2 focus:ring-gs-accent/40 focus:ring-offset-2 focus:ring-offset-gs-surface"
      style={{
        background:  checked ? 'var(--gs-accent)' : 'var(--gs-border)',
        transition: 'background 0.25s',
      }}
    >
      <span
        className="absolute left-0.5 w-4 h-4 rounded-full bg-white shadow"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.25s' }}
      />
    </button>
  );
}

/* ── Password input with show/hide ───────────────────────────────────── */
function PasswordInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-3 pr-10 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
        style={{
          background:  'var(--gs-surface-2)',
          borderColor: 'var(--gs-border)',
          color:       'var(--gs-text)',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--gs-accent)')}
        onBlur={e  => (e.currentTarget.style.borderColor = 'var(--gs-border)')}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--gs-faint)' }}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export function Settings() {
  const { colorMode, setColorMode, accentKey, setAccentKey, language, setLanguage, isGuest } = useAppSettings();
  const t = useT();
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get('section');
  const validSections: Section[] = ['appearance', 'language', 'preferences', 'account', 'notifications'];

  const [section,      setSection]      = useState<Section>(
    initialSection && validSections.includes(initialSection as Section)
      ? (initialSection as Section)
      : 'appearance'
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const [skipIntro,    setSkipIntro]    = useState(false);
  const [genOpen,      setGenOpen]      = useState(true);

  /* Account form state */
  const currentUser = getUser();
  const [username,         setUsername]         = useState(currentUser?.username ?? '');
  const [email,            setEmail]            = useState(currentUser?.email ?? '');
  const [currentPassword,  setCurrentPassword]  = useState('');
  const [newPassword,      setNewPassword]      = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [saving,           setSaving]           = useState(false);
  const [saveStatus,       setSaveStatus]       = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage,      setSaveMessage]      = useState('');
  const [avatarUrl,        setAvatarUrl]        = useState(currentUser?.avatar_url ?? '');
  const [cropImageSrc,     setCropImageSrc]     = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    notify_trades: true,
    notify_support: true,
    notify_orders: true,
    notify_promos: false,
    notify_email: false,
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifStatus, setNotifStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!currentUser) return;
    setNotifLoading(true);
    apiGetNotificationPrefs()
      .then(setNotifPrefs)
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, [currentUser?.id]);

  const accentColor = ACCENT_MAP[accentKey];

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveStatus('error');
      setSaveMessage('Please choose a JPG, PNG, or WebP image.');
      setTimeout(() => setSaveStatus('idle'), 4000);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveStatus('error');
      setSaveMessage('Image must be under 2 MB.');
      setTimeout(() => setSaveStatus('idle'), 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setAvatarUrl(croppedDataUrl);
    setCropImageSrc(null);
  };

  const handleCropClose = () => setCropImageSrc(null);

  /* Account save handler */
  const handleSaveAccount = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      setSaveStatus('error');
      setSaveMessage('New passwords do not match.');
      return;
    }
    setSaving(true);
    setSaveStatus('idle');
    try {
      await apiUpdateProfile({
        username:        username !== currentUser?.username ? username : undefined,
        email:           email    !== currentUser?.email    ? email    : undefined,
        avatar_url:      avatarUrl !== (currentUser?.avatar_url ?? '') ? (avatarUrl || null) : undefined,
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword:     newPassword || undefined,
      });
      setSaveStatus('success');
      setSaveMessage(t('settings.account.savedOk'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveMessage(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const handleSaveNotifications = async () => {
    if (!currentUser) return;
    setNotifSaving(true);
    setNotifStatus('idle');
    try {
      const updated = await apiUpdateNotificationPrefs(notifPrefs);
      setNotifPrefs(updated);
      setNotifStatus('success');
      setTimeout(() => setNotifStatus('idle'), 3000);
    } catch {
      setNotifStatus('error');
      setTimeout(() => setNotifStatus('idle'), 4000);
    } finally {
      setNotifSaving(false);
    }
  };

  const sideGroups = [
    {
      key: 'general',
      label: t('settings.general'),
      Icon: SlidersHorizontal,
      open: genOpen,
      onToggle: () => setGenOpen(o => !o),
      children: [
        { key: 'appearance'  as Section, label: t('settings.colorMode')   },
        { key: 'language'    as Section, label: t('settings.language')    },
        { key: 'preferences' as Section, label: t('settings.preferences') },
      ],
    },
    { key: 'account'       as Section, label: t('settings.account'),       Icon: User,   children: [] },
    { key: 'notifications' as Section, label: t('settings.notifications'), Icon: Bell,   children: [] },
  ];

  /* shared field input style */
  const fieldStyle = {
    background:  'var(--gs-surface-2)',
    borderColor: 'var(--gs-border)',
    color:       'var(--gs-text)',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gs-bg)' }}>
      {/* Page header */}
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-2xl" style={{ color: 'var(--gs-text)', fontWeight: 700 }}>{t('settings.title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--gs-muted)' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="flex px-8 pb-12 gap-6">
        {/* ── Left nav ────────────────────────────────────────────────── */}
        <nav className="w-48 shrink-0 space-y-0.5">
          {sideGroups.map(g => (
            <div key={g.key}>
              <button
                onClick={() => g.children.length ? g.onToggle?.() : setSection(g.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  color:      section === g.key && !g.children.length ? 'var(--gs-text)' : 'var(--gs-muted)',
                  background: section === g.key && !g.children.length ? 'var(--gs-surface-2)' : 'transparent',
                  fontWeight: section === g.key && !g.children.length ? 600 : 500,
                }}
              >
                <g.Icon className="size-3.5 shrink-0" />
                <span className="flex-1 text-left">{g.label}</span>
                {g.children.length > 0 && (
                  <ChevronRight
                    className="size-3.5 transition-transform duration-200"
                    style={{ transform: g.open ? 'rotate(90deg)' : 'rotate(0)' }}
                  />
                )}
              </button>

              {g.open && g.children.length > 0 && (
                <div className="ml-3.5 pl-3 mt-0.5 mb-1 border-l" style={{ borderColor: 'var(--gs-border)' }}>
                  {g.children.map(c => (
                    <button
                      key={c.key}
                      onClick={() => setSection(c.key)}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all"
                      style={{
                        color:       section === c.key ? 'var(--gs-text)' : 'var(--gs-muted)',
                        background:  section === c.key ? 'var(--gs-surface-2)' : 'transparent',
                        fontWeight:  section === c.key ? 600 : 400,
                        borderLeft:  section === c.key ? `2px solid ${accentColor}` : '2px solid transparent',
                        paddingLeft: '10px',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* ── Right content ────────────────────────────────────────────── */}
        <div className="flex-1 max-w-3xl space-y-4">

          {/* ── APPEARANCE ── */}
          {section === 'appearance' && (
            <div className="rounded-2xl border p-8" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
              {/* Guest notice */}
              {isGuest && (
                <div
                  className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: 'color-mix(in oklab, var(--gs-accent) 10%, var(--gs-surface-2))',
                    border: '1px solid color-mix(in oklab, var(--gs-accent) 30%, transparent)',
                    color: 'var(--gs-muted)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>🔒</span>
                  <span>
                    <strong style={{ color: 'var(--gs-text)' }}>Sign in</strong> to customise your appearance. Guests always use light mode.
                  </span>
                </div>
              )}

              <div className="flex gap-8" style={{ opacity: isGuest ? 0.45 : 1, pointerEvents: isGuest ? 'none' : undefined }}>
                <div className="w-44 shrink-0">
                  <p className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: 600 }}>{t('settings.appearance')}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--gs-muted)' }}>
                    {t('settings.appearance.desc')}
                  </p>
                </div>
                <div className="flex-1 space-y-8">
                  {/* Color mode cards */}
                  <div>
                    <p className="text-[10px] mb-4 tracking-widest uppercase" style={{ color: 'var(--gs-muted)', fontWeight: 600 }}>{t('settings.colorMode.label')}</p>
                    <div className="flex gap-5">
                      {COLOR_MODE_LIST.map(({ mode, modeKey, Icon }) => {
                        const Preview = PREVIEWS[mode];
                        const active  = colorMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => setColorMode(mode)}
                            className="flex flex-col items-center gap-2 focus:outline-none"
                          >
                            <div
                              className="w-28 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200"
                              style={{
                                borderColor: active ? accentColor : 'var(--gs-border)',
                                boxShadow:   active ? `0 0 0 3px color-mix(in oklab, ${accentColor} 22%, transparent)` : 'none',
                              }}
                            >
                              <Preview />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Icon className="size-3.5" style={{ color: active ? accentColor : 'var(--gs-muted)' }} />
                              <span
                                className="text-xs"
                                style={{ color: active ? accentColor : 'var(--gs-muted)', fontWeight: active ? 600 : 400 }}
                              >
                                {t(`settings.mode.${modeKey}` as Parameters<typeof t>[0])}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent swatches */}
                  <div>
                    <p className="text-[10px] mb-4 tracking-widest uppercase" style={{ color: 'var(--gs-muted)', fontWeight: 600 }}>{t('settings.themeColor')}</p>
                    <div className="flex gap-3 flex-wrap">
                      {ACCENT_KEYS.map(key => (
                        <button
                          key={key}
                          onClick={() => setAccentKey(key)}
                          className="flex flex-col items-center gap-1.5 focus:outline-none"
                          title={t(`settings.accent.${key}` as Parameters<typeof t>[0])}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                            style={{
                              background: ACCENT_MAP[key],
                              boxShadow:  accentKey === key
                                ? `0 0 0 2px var(--gs-surface), 0 0 0 4px ${ACCENT_MAP[key]}`
                                : 'none',
                              transform: accentKey === key ? 'scale(1.2)' : 'scale(1)',
                            }}
                          >
                            {accentKey === key && <Check className="size-3.5 text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-[10px]" style={{ color: 'var(--gs-faint)' }}>
                            {t(`settings.accent.${key}` as Parameters<typeof t>[0])}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LANGUAGE ── */}
          {section === 'language' && (
            <div className="rounded-2xl border p-8" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
              <div className="flex gap-8">
                <div className="w-44 shrink-0">
                  <p className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: 600 }}>{t('settings.language')}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--gs-muted)' }}>
                    {t('settings.lang.choose')}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col gap-3 max-w-xs">
                    {([
                      { value: 'en' as AppLanguage, label: t('settings.lang.en'), flag: 'US' },
                      { value: 'vi' as AppLanguage, label: t('settings.lang.vi'), flag: 'VN' },
                    ] as { value: AppLanguage; label: string; flag: string }[]).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setLanguage(opt.value)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                        style={{
                          borderColor: language === opt.value ? accentColor : 'var(--gs-border)',
                          background:  language === opt.value
                            ? `color-mix(in oklab, ${accentColor} 8%, var(--gs-surface-2))`
                            : 'var(--gs-surface-2)',
                          boxShadow: language === opt.value
                            ? `0 0 0 2px color-mix(in oklab, ${accentColor} 18%, transparent)`
                            : 'none',
                        }}
                      >
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--gs-border)', color: 'var(--gs-text)' }}>{opt.flag}</span>
                        <span className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: language === opt.value ? 600 : 400 }}>
                          {opt.label}
                        </span>
                        {language === opt.value && (
                          <Check className="size-4 ml-auto" style={{ color: accentColor }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PREFERENCES ── */}
          {section === 'preferences' && (
            <div className="rounded-2xl border p-8" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
              <div className="flex gap-8">
                <div className="w-44 shrink-0">
                  <p className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: 600 }}>{t('settings.pref.title')}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--gs-muted)' }}>
                    {t('settings.pref.desc')}
                  </p>
                </div>
                <div className="flex-1 divide-y" style={{ borderColor: 'var(--gs-border)' }}>
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: 500 }}>{t('settings.pref.reduceMotion')}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--gs-muted)' }}>{t('settings.pref.reduceMotion.desc')}</p>
                    </div>
                    <Toggle checked={reduceMotion} onChange={() => setReduceMotion(v => !v)} />
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: 500 }}>{t('settings.pref.skipIntro')}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--gs-muted)' }}>{t('settings.pref.skipIntro.desc')}</p>
                    </div>
                    <Toggle checked={skipIntro} onChange={() => setSkipIntro(v => !v)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ACCOUNT ── */}
          {section === 'account' && (
            <div className="rounded-2xl border p-8 space-y-6" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="group relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-gs-accent/40"
                    style={{ borderColor: 'var(--gs-border)' }}
                    title="Upload profile photo"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-2xl"
                        style={{ background: `color-mix(in oklab, ${accentColor} 20%, var(--gs-surface-2))`, color: accentColor, fontWeight: 700 }}
                      >
                        {(username || 'U').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="size-5 text-white" />
                    </div>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarPick}
                  />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: 600 }}>
                    {currentUser ? t('settings.account.edit') : t('settings.account.signInMsg')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--gs-muted)' }}>
                    {t('settings.account.desc')}
                  </p>
                  {currentUser && (
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="text-xs font-semibold"
                        style={{ color: accentColor }}
                      >
                        Upload photo
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="text-xs"
                          style={{ color: 'var(--gs-faint)' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!currentUser ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--gs-muted)' }}>
                  {t('settings.account.signInReq')}
                </p>
              ) : (
                <>
                  {/* Profile fields */}
                  <div className="space-y-4">
                    <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gs-muted)', fontWeight: 600 }}>{t('settings.account.profile')}</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--gs-muted)', fontWeight: 500 }}>{t('settings.account.displayName')}</label>
                        <input
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="w-full pl-3 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
                          style={fieldStyle}
                          onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
                          onBlur={e  => (e.currentTarget.style.borderColor = 'var(--gs-border)')}
                          placeholder={t('settings.account.displayName')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--gs-muted)', fontWeight: 500 }}>{t('settings.account.email')}</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full pl-3 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
                          style={fieldStyle}
                          onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
                          onBlur={e  => (e.currentTarget.style.borderColor = 'var(--gs-border)')}
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password fields */}
                  <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--gs-border)' }}>
                    <p className="text-xs tracking-widest uppercase pt-2" style={{ color: 'var(--gs-muted)', fontWeight: 600 }}>
                      {t('settings.account.changePwd')} <span style={{ color: 'var(--gs-faint)', textTransform: 'none', letterSpacing: 0 }}>{t('settings.account.optional')}</span>
                    </p>

                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--gs-muted)', fontWeight: 500 }}>{t('settings.account.currentPwd')}</label>
                      <PasswordInput value={currentPassword} onChange={setCurrentPassword} placeholder={t('settings.account.currentPwd')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--gs-muted)', fontWeight: 500 }}>{t('settings.account.newPwd')}</label>
                        <PasswordInput value={newPassword} onChange={setNewPassword} placeholder={t('settings.account.newPwd')} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--gs-muted)', fontWeight: 500 }}>{t('settings.account.confirmPwd')}</label>
                        <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder={t('settings.account.confirmPwd')} />
                      </div>
                    </div>
                  </div>

                  {/* Status message */}
                  {saveStatus !== 'idle' && (
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: saveStatus === 'success'
                          ? 'color-mix(in oklab, #16a34a 12%, var(--gs-surface-2))'
                          : 'color-mix(in oklab, #dc2626 12%, var(--gs-surface-2))',
                        color: saveStatus === 'success' ? '#16a34a' : '#ef4444',
                      }}
                    >
                      {saveStatus === 'success'
                        ? <CheckCircle2 className="size-4 shrink-0" />
                        : <AlertCircle  className="size-4 shrink-0" />
                      }
                      {saveMessage}
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex justify-end pt-2">
                    <button
                      id="account-save-btn"
                      onClick={handleSaveAccount}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                      style={{ background: accentColor, color: '#fff' }}
                    >
                      {saving
                        ? <><Loader2 className="size-4 animate-spin" /> {t('settings.account.saving')}</>
                        : t('settings.account.save')
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {section === 'notifications' && (
            <div className="rounded-2xl border p-8" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
              <div className="flex gap-8">
                <div className="w-44 shrink-0">
                  <p className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: 600 }}>{t('settings.notifications')}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--gs-muted)' }}>
                    {t('settings.notif.desc')}
                  </p>
                </div>
                <div className="flex-1">
                  {!currentUser ? (
                    <p className="text-sm py-4" style={{ color: 'var(--gs-muted)' }}>{t('settings.account.signInReq')}</p>
                  ) : notifLoading ? (
                    <div className="flex items-center gap-2 py-8" style={{ color: 'var(--gs-faint)' }}>
                      <Loader2 className="size-4 animate-spin" /> {t('common.loading')}
                    </div>
                  ) : (
                    <>
                      <div className="divide-y" style={{ borderColor: 'var(--gs-border)' }}>
                        {([
                          { key: 'notify_trades' as const, label: t('settings.notif.trades'), desc: t('settings.notif.trades.desc') },
                          { key: 'notify_support' as const, label: t('settings.notif.support'), desc: t('settings.notif.support.desc') },
                          { key: 'notify_orders' as const, label: t('settings.notif.orders'), desc: t('settings.notif.orders.desc') },
                          { key: 'notify_promos' as const, label: t('settings.notif.promos'), desc: t('settings.notif.promos.desc') },
                          { key: 'notify_email' as const, label: t('settings.notif.email'), desc: t('settings.notif.email.desc') },
                        ]).map(row => (
                          <div key={row.key} className="flex items-center justify-between py-4 first:pt-0">
                            <div className="pr-4">
                              <p className="text-sm" style={{ color: 'var(--gs-text)', fontWeight: 500 }}>{row.label}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--gs-muted)' }}>{row.desc}</p>
                            </div>
                            <Toggle
                              checked={notifPrefs[row.key]}
                              onChange={() => setNotifPrefs(p => ({ ...p, [row.key]: !p[row.key] }))}
                            />
                          </div>
                        ))}
                      </div>

                      {notifStatus === 'success' && (
                        <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'color-mix(in oklab, #16a34a 12%, var(--gs-surface-2))', color: '#16a34a' }}>
                          <CheckCircle2 className="size-4 shrink-0" />
                          {t('settings.notif.savedOk')}
                        </div>
                      )}
                      {notifStatus === 'error' && (
                        <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'color-mix(in oklab, #dc2626 12%, var(--gs-surface-2))', color: '#ef4444' }}>
                          <AlertCircle className="size-4 shrink-0" />
                          {t('common.error')}
                        </div>
                      )}

                      <div className="flex justify-end pt-6">
                        <button
                          onClick={handleSaveNotifications}
                          disabled={notifSaving}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                          style={{ background: accentColor, color: '#fff' }}
                        >
                          {notifSaving
                            ? <><Loader2 className="size-4 animate-spin" /> {t('settings.account.saving')}</>
                            : t('settings.account.save')
                          }
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          open={!!cropImageSrc}
          onClose={handleCropClose}
          onComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
