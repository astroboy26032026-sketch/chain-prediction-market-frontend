// src/components/layout/Navbar.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { Menu, X } from 'lucide-react';

import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

const SolanaAuth = dynamic(() => import('@/components/auth/SolanaAuth'), {
  ssr: false,
});

/* =========================
   Palette setup
========================= */
type Palette = 'seed' | 'sprout' | 'bud' | 'bloom' | 'canopy' | 'galaxy';
const PALETTES: Palette[] = ['seed', 'sprout', 'bud', 'bloom', 'canopy', 'galaxy'];

/* =========================
   SVG brand icons
========================= */
const TelegramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props} className={`social-icon ${props.className ?? ''}`}>
    <path d="M9.036 15.47 9.2 19.1c.4 0 .58-.17.79-.37l1.9-1.82 3.94 2.88c.72.4 1.22.19 1.41-.67l2.56-12.03h.01c.23-1.11-.4-1.54-1.1-1.27L3.34 10.01c-1.06.41-1.04 1-.18 1.27l4.7 1.47 10.91-6.88c.51-.32.98-.14.6.18l-10.4 9.45z" />
  </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props} className={`social-icon ${props.className ?? ''}`}>
    <path d="M18.244 2H21l-6.36 7.27L22 22h-6.828l-4.82-6.314L4.76 22H2l6.89-7.88L2 2h6.914l4.39 5.77L18.244 2Zm-1.196 18h1.86L8.01 3.96H6.05L17.048 20Z" />
  </svg>
);

/* =========================
   Theme + Palette logic
========================= */
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved as 'light' | 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
};

const applyTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;
  const body = document.body;
  root.classList.toggle('dark', theme === 'dark');
  body.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

const getInitialPalette = (): Palette => {
  if (typeof window === 'undefined') return 'seed';
  const saved = localStorage.getItem('palette') as Palette | null;
  return saved && PALETTES.includes(saved) ? saved : 'seed';
};

const applyPalette = (p: Palette) => {
  const root = document.documentElement;
  const body = document.body;
  root.setAttribute('data-palette', p);
  body.setAttribute('data-palette', p);
  localStorage.setItem('palette', p);
};

/* =========================
   NavLink
========================= */
const NavLink: React.FC<{ href: string; children: React.ReactNode; exact?: boolean; onClick?: () => void }> = ({
  href,
  children,
  exact = false,
  onClick,
}) => {
  const router = useRouter();
  const isActive = useMemo(() => {
    const path = router.asPath.split('?')[0];
    return exact ? path === href : path.startsWith(href);
  }, [router.asPath, href, exact]);

  return (
    <Link href={href} className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`} onClick={onClick}>
      {children}
    </Link>
  );
};

/* =========================
   Sidebar content (shared between desktop & mobile)
========================= */
const SidebarContent: React.FC<{
  palette: Palette;
  onPaletteChange: (p: Palette) => void;
  onPointClick: () => void;
  onRewardClick: () => void;
  onCreateClick: () => void;
  onNavClick?: () => void;
}> = ({
  palette, onPaletteChange,
  onPointClick, onRewardClick, onCreateClick, onNavClick,
}) => (
  <>
    <div>
      {/* Menu */}
      <div className="flex flex-col gap-2 sidebar-menu">
        <NavLink href="/events" onClick={onNavClick}>
          <span className="text-lg leading-none">🌌</span>
          <span className="sidebar-label">Promote</span>
        </NavLink>

        <button onClick={() => { onPointClick(); onNavClick?.(); }} className="sidebar-link">
          <span className="text-lg leading-none">⭐</span>
          <span className="sidebar-label">Point System</span>
        </button>

        <button onClick={() => { onRewardClick(); onNavClick?.(); }} className="sidebar-link">
          <span className="text-lg leading-none">🎁</span>
          <span className="sidebar-label">Rewards</span>
        </button>

        <NavLink href="/stake" onClick={onNavClick}>
          <span className="text-lg leading-none">🪐</span>
          <span className="sidebar-label">Stake</span>
        </NavLink>

        <button
          onClick={() => { onCreateClick(); onNavClick?.(); }}
          className="btn btn-primary w-full font-semibold mt-4 flex items-center justify-center gap-2"
        >
          <span>Create Token</span>
        </button>

        {/* Solana Wallet + Auth */}
        <div className="mt-3">
          <SolanaAuth />
        </div>

        {/* Palette */}
        <div className="mt-4 p-3 rounded-xl border border-[var(--navbar-border)] bg-[var(--card)] bg-opacity-70 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-80">Palette</span>
            <div className="palette-dots">
              {PALETTES.map((p) => (
                <button
                  key={p}
                  aria-label={`Use ${p} palette`}
                  className={`palette-dot palette-dot--${p} ${palette === p ? 'is-active' : ''}`}
                  onClick={() => onPaletteChange(p)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="mt-auto pt-4 border-t border-[var(--navbar-border)]">
      <div className="flex flex-col items-center gap-2">
        <div className="social-links">
          <a href="https://t.me/your_channel" target="_blank" rel="noopener noreferrer" className="social-link">
            <TelegramIcon />
          </a>
          <a href="https://twitter.com/your_handle" target="_blank" rel="noopener noreferrer" className="social-link">
            <XIcon />
          </a>
        </div>

        <div className="footer-nav flex-wrap">
          <Link href="/about" className="footer-nav-link" onClick={onNavClick}>
            Docs & How it Works
          </Link>
          <Link href="/FAQ" className="footer-nav-link" onClick={onNavClick}>
            FAQ
          </Link>
        </div>

        <p className="footer-text">© {new Date().getFullYear()} CosmoX</p>
      </div>
    </div>
  </>
);

/* =========================
   Navbar Component
========================= */
const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  // Close mobile menu on route change
  useEffect(() => {
    const close = () => setMobileOpen(false);
    router.events.on('routeChangeComplete', close);
    return () => router.events.off('routeChangeComplete', close);
  }, [router.events]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();

  const [palette, setPalette] = useState<Palette>('seed');

  useEffect(() => {
    applyTheme('dark');
    const p = getInitialPalette();
    applyPalette(p);
    setPalette(p);
  }, []);

  const sharedProps = {
    palette,
    onPaletteChange: (p: Palette) => { setPalette(p); applyPalette(p); },
    onPointClick: () => {
      if (!address) return toast.error('Please connect your wallet first');
      router.push(`/point/${address}`);
    },
    onRewardClick: () => {
      if (!address) return toast.error('Please connect your wallet first');
      router.push(`/reward/${address}`);
    },
    onCreateClick: () => router.push('/create'),
  };

  return (
    <>
      {/* ===== MOBILE TOP BAR ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-[var(--navbar-bg)] border-b border-[var(--navbar-border)] backdrop-blur-md safe-area-top">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="Logo" width={44} height={44} className="rounded-lg" priority />
          <span className="brand-title" style={{ fontSize: '20px' }}>CosmoX</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-[var(--card-hover)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ===== MOBILE SIDEBAR OVERLAY ===== */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}
      <nav
        className={`
          md:hidden fixed top-14 left-0 bottom-0 z-40 w-[280px] max-w-[85vw]
          overflow-y-auto flex flex-col justify-between px-4 py-4
          bg-[var(--navbar-bg)] border-r border-[var(--navbar-border)]
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent {...sharedProps} onNavClick={() => setMobileOpen(false)} />
      </nav>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <nav className="hidden md:flex navbar app-navbar fixed left-0 top-0 z-40 h-screen w-[248px] flex-col justify-between px-4 py-6">
        {/* Desktop keeps logo */}
        <div>
          <Link href="/" className="flex items-center gap-2 mb-6 group">
            <Image
              src="/logo.png"
              alt="CosmoX Logo"
              width={96}
              height={96}
              className="rounded-xl logo-bounce shadow-lg"
              priority
            />
            <span className="brand-title">CosmoX</span>
          </Link>
        </div>
        <SidebarContent {...sharedProps} />
      </nav>
    </>
  );
};

export default Navbar;
