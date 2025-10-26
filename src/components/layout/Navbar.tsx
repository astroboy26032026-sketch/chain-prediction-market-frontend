import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { toast } from 'react-toastify';
import HowItWorksPopup from '@/components/notifications/HowItWorksPopup';
import { shortenAddress } from '@/utils/blockchainUtils';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, User2, UsersRound, Gift , Trophy ,Gem , Coins } from 'lucide-react';

/* =========================
   Palette setup
========================= */
type Palette = 'seed' | 'sprout' | 'bud' | 'bloom' | 'canopy';
const PALETTES: Palette[] = ['seed', 'sprout', 'bud', 'bloom', 'canopy'];

/* =========================
   SVG brand icons
========================= */
const TelegramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props} className={`social-icon ${props.className ?? ''}`}>
    <path d="M9.036 15.47 9.2 19.1c.4 0 .58-.17.79-.37l1.9-1.82 3.94 2.88c.72.4 1.22.19 1.41-.67l2.56-12.03h.01c.23-1.11-.4-1.54-1.1-1.27L3.34 10.01c-1.06.41-1.04 1-.18 1.27l4.7 1.47 10.91-6.88c.51-.32.98-.14.6.18l-10.4 9.45z"/>
  </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props} className={`social-icon ${props.className ?? ''}`}>
    <path d="M18.244 2H21l-6.36 7.27L22 22h-6.828l-4.82-6.314L4.76 22H2l6.89-7.88L2 2h6.914l4.39 5.77L18.244 2Zm-1.196 18h1.86L8.01 3.96H6.05L17.048 20Z"/>
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
const NavLink: React.FC<{ href: string; children: React.ReactNode; exact?: boolean }> = ({ href, children, exact = false }) => {
  const router = useRouter();
  const isActive = useMemo(() => {
    const path = router.asPath.split('?')[0];
    return exact ? path === href : path.startsWith(href);
  }, [router.asPath, href, exact]);
  return (
    <Link href={href} className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
      {children}
    </Link>
  );
};

/* =========================
   Wallet Connect
========================= */
const CustomConnectButton = () => (
  <ConnectButton.Custom>
    {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
      const ready = mounted;
      const connected = ready && account && chain;
      return (
        <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
          {!connected ? (
            <button onClick={openConnectModal} className="btn btn-primary w-full font-semibold">
              Connect Wallet
            </button>
          ) : chain?.unsupported ? (
            <button onClick={openChainModal} className="btn btn-secondary w-full text-[12px] px-2 py-1">
              Wrong network
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={openChainModal} className="btn btn-secondary text-[12px] w-full flex items-center justify-center">
                {chain?.iconUrl && <img src={chain.iconUrl} alt={chain.name ?? 'Chain'} width={14} height={14} className="rounded-full mr-2" />}
                {chain?.name}
              </button>
              <button onClick={openAccountModal} className="btn btn-primary text-[12px] px-2 py-1 w-full">
                {account?.address ? shortenAddress(account.address) : 'Account'}
                {account?.displayBalance && <span className="hidden sm:inline ml-1">({account.displayBalance})</span>}
              </button>
            </div>
          )}
        </div>
      );
    }}
  </ConnectButton.Custom>
);

/* =========================
   Navbar Component
========================= */
const Navbar: React.FC = () => {
  const [showHow, setShowHow] = useState(false);
  const { address } = useAccount();
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [palette, setPalette] = useState<Palette>('seed');

  useEffect(() => {
    const t = getInitialTheme();
    applyTheme(t);
    setIsDark(t === 'dark');
    const p = getInitialPalette();
    applyPalette(p);
    setPalette(p);
  }, []);

  const handleThemeToggle = (v: boolean) => {
    setIsDark(v);
    applyTheme(v ? 'dark' : 'light');
  };

  const handlePaletteChange = (p: Palette) => {
    setPalette(p);
    applyPalette(p);
  };

  const handleProfileClick = () => {
    if (!address) return toast.error('Please connect your wallet first');
    router.push(`/profile/${address}`);
  };

  return (
    <>
      <nav className="navbar app-navbar fixed left-0 top-0 z-40 h-screen w-[248px] flex flex-col justify-between px-4 py-6">
        {/* Logo */}
        <div>
          <Link href="/" className="flex items-center gap-3 mb-6 group">
            <Image src="/logo-seed.png" alt="Pumpfun Clone Logo" width={72} height={72} className="rounded-xl logo-bounce shadow-lg" priority />
            <span className="brand-title">Pumpfun Clone</span>
          </Link>

          {/* Menu */}
          <div className="flex flex-col gap-2 sidebar-menu">
            <button onClick={handleProfileClick} className="sidebar-link">
              <User2 className="sidebar-icon" />
              <span className="sidebar-label">My Profile</span>
            </button>

            <NavLink href="/leaderboard">
              <Trophy className="sidebar-icon" />
              <span className="sidebar-label">Leader Board</span>
            </NavLink>

            <NavLink href="/referrals">
              <UsersRound className="sidebar-icon" />
              <span className="sidebar-label">Referrals</span>
            </NavLink>

            <NavLink href="/reward">
              <Gift className="sidebar-icon" />
              <span className="sidebar-label">Rewards</span>
            </NavLink>

            <NavLink href="/point">
              <Gem className="sidebar-icon" />
              <span className="sidebar-label">Points</span>
            </NavLink>            


            <NavLink href="/stake">
              <Coins className="sidebar-icon" />
              <span className="sidebar-label">Stake</span>
            </NavLink>

            <button onClick={() => router.push('/create')} className="btn btn-primary w-full font-semibold mt-4 flex items-center justify-center gap-2">
              <span>Create Token</span>
            </button>

            <div className="mt-3">
              <CustomConnectButton />
            </div>

            {/* Theme & Palette */}
            <div className="mt-4 p-3 rounded-xl border border-[var(--navbar-border)] bg-[var(--card)] bg-opacity-70 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isDark ? <Moon className="w-5 h-5 text-[var(--primary)]" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                  <span className="text-[13px] opacity-90">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={handleThemeToggle}
                  className={`${isDark ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--card-border)]'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                >
                  <span className={`${isDark ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </Switch>
              </div>

              {/* Palette section */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs opacity-80">Palette</span>
                <div className="palette-dots">
                  {PALETTES.map((p) => (
                    <button
                      key={p}
                      aria-label={`Use ${p} palette`}
                      className={`palette-dot palette-dot--${p} ${palette === p ? 'is-active' : ''}`}
                      onClick={() => handlePaletteChange(p)}
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
              <a href="https://t.me/your_channel" target="_blank" rel="noopener noreferrer" className="social-link"><TelegramIcon /></a>
              <a href="https://twitter.com/your_handle" target="_blank" rel="noopener noreferrer" className="social-link"><XIcon /></a>
            </div>

            <div className="footer-nav">
              <Link href="/about" className="footer-nav-link">Doc</Link>
              <Link href="/FAQ" className="footer-nav-link">FAQ</Link>
              <button onClick={() => setShowHow(true)} className="footer-nav-link">How it Works</button>
            </div>

            <p className="footer-text">© {new Date().getFullYear()} Pumpfun Clone</p>
          </div>
        </div>
      </nav>

      <HowItWorksPopup isVisible={showHow} onClose={() => setShowHow(false)} />
    </>
  );
};

export default Navbar;
