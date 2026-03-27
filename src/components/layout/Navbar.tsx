// src/components/layout/Navbar.tsx — Horizontal top navigation bar
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { toastError } from '@/utils/customToast';
import { Menu, X } from 'lucide-react';

import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

const SolanaAuth = dynamic(() => import('@/components/auth/SolanaAuth'), {
  ssr: false,
});

/* =========================
   Palette setup
========================= */
type Palette = 'galaxy';

const applyTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;
  const body = document.body;
  root.classList.toggle('dark', theme === 'dark');
  body.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

const getInitialPalette = (): Palette => 'galaxy';

const applyPalette = (p: Palette) => {
  const root = document.documentElement;
  const body = document.body;
  root.setAttribute('data-palette', p);
  body.setAttribute('data-palette', p);
  localStorage.setItem('palette', p);
};

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
   NavLink
========================= */
const NavLink: React.FC<{ href: string; children: React.ReactNode; exact?: boolean; onClick?: () => void }> = ({
  href, children, exact = false, onClick,
}) => {
  const router = useRouter();
  const isActive = useMemo(() => {
    const path = router.asPath.split('?')[0];
    return exact ? path === href : path.startsWith(href);
  }, [router.asPath, href, exact]);

  return (
    <Link
      href={href}
      className={`topbar-link px-5 py-3 rounded-xl text-base font-bold transition-colors ${
        isActive ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
};

/* =========================
   Navbar Component — horizontal top bar
========================= */
const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const close = () => setMobileOpen(false);
    router.events.on('routeChangeComplete', close);
    return () => router.events.off('routeChangeComplete', close);
  }, [router.events]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();

  useEffect(() => {
    applyTheme('dark');
    applyPalette(getInitialPalette());
  }, []);

  const goPoint = () => {
    if (!address) return toastError('Please connect your wallet first');
    router.push(`/point/${address}`);
  };
  const goReward = () => {
    if (!address) return toastError('Please connect your wallet first');
    router.push(`/reward/${address}`);
  };
  const goReferral = () => {
    if (!address) return toastError('Please connect your wallet first');
    router.push(`/referral/${address}`);
  };

  const navItems = (onNav?: () => void) => (
    <>
      <NavLink href="/events" onClick={onNav}>
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none">🍬</span>
          <span>Promote</span>
        </span>
      </NavLink>
      <button onClick={() => { goPoint(); onNav?.(); }} className="topbar-link px-5 py-3 rounded-xl text-base font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none">🍭</span>
          <span>Sweet Point</span>
        </span>
      </button>
      <button onClick={() => { goReward(); onNav?.(); }} className="topbar-link px-5 py-3 rounded-xl text-base font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none">🎀</span>
          <span>Rewards</span>
        </span>
      </button>
      <button onClick={() => { goReferral(); onNav?.(); }} className="topbar-link px-5 py-3 rounded-xl text-base font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none">🍡</span>
          <span>Referral</span>
        </span>
      </button>
    </>
  );

  return (
    <>
      {/* ===== TOP BAR (all screens) ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--navbar-bg)] border-b border-[var(--navbar-border)] backdrop-blur-md safe-area-top">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <Image src="/logo.png" alt="Zugar" width={64} height={64}
              className="rounded-xl drop-shadow-lg transition-transform duration-500 group-hover:rotate-[20deg] group-hover:scale-110 animate-[candy-bounce_3s_ease-in-out_infinite]"
              priority />
            <span className="brand-title text-3xl font-black tracking-tight bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">Zugar</span>
          </Link>

          {/* Desktop nav items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems()}
          </nav>

          {/* Right side: socials + wallet */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <a href="https://t.me/your_channel" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <TelegramIcon width={18} height={18} />
              </a>
              <a href="https://twitter.com/your_handle" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <XIcon width={18} height={18} />
              </a>
            </div>
            <SolanaAuth />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--card-hover)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ===== MOBILE DROPDOWN MENU ===== */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}
      <nav
        className={`
          md:hidden fixed top-24 left-0 right-0 z-40
          bg-[var(--navbar-bg)] border-b border-[var(--navbar-border)]
          transition-all duration-300 ease-in-out overflow-hidden
          ${mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="flex flex-col gap-1 p-4">
          {navItems(() => setMobileOpen(false))}
          <div className="mt-3 pt-3 border-t border-[var(--navbar-border)]">
            <SolanaAuth />
          </div>
          <div className="flex items-center gap-3 mt-3">
            <a href="https://t.me/your_channel" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <TelegramIcon width={18} height={18} />
            </a>
            <a href="https://twitter.com/your_handle" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <XIcon width={18} height={18} />
            </a>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
