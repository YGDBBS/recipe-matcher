import { useState } from 'react';

type Tab = 'home' | 'all' | 'mine' | 'create' | 'pantry' | 'login';
import { CookingPot, Menu, X, User, LogOut } from 'lucide-react';

interface HeaderProps {
  onLogout: () => void;
  isAuthenticated: boolean;
  onNavigate?: (tab: Tab) => void;
}

const navLinks = [
  { label: 'All Recipes', href: '#' },
  { label: 'My Recipes', href: '#' },
  { label: 'Create Recipe', href: '#' },
  { label: 'Shopping List', href: '#' },
  { label: 'Pantry', href: '#' },
  { label: 'Community', href: '#' },
  { label: 'Contact', href: '#' },
];

export default function Header({ onLogout, isAuthenticated, onNavigate }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <a href="#" className="flex items-center gap-2 group" onClick={(e) => { e.preventDefault(); onNavigate?.('home'); }}>
            <CookingPot className="w-6 h-6 text-black" />
            <span className="font-bold text-gray-900 group-hover:text-lime-600 transition-colors">Pantry Dropper</span>
          </a>

          {/* Center: Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                if (!onNavigate) return;
                let targetTab: Tab | undefined;
                switch (link.label) {
                  case 'All Recipes':
                    targetTab = 'all';
                    break;
                  case 'My Recipes':
                    targetTab = isAuthenticated ? 'mine' : 'login';
                    break;
                  case 'Create Recipe':
                    targetTab = isAuthenticated ? 'create' : 'login';
                    break;
                  case 'Pantry':
                    targetTab = isAuthenticated ? 'pantry' : 'login';
                    break;
                  default:
                    targetTab = undefined;
                }
                if (targetTab) {
                  e.preventDefault();
                  onNavigate(targetTab);
                }
              };
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="relative text-sm text-gray-700 hover:text-lime-600 underline-animation"
                  onClick={handleClick}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <a
                  href="#"
                  className="text-sm text-gray-700 hover:text-lime-600"
                >
                  Sign In
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-md bg-lime-500 px-4 py-2 text-sm font-medium text-white shadow-lime-glow hover:scale-105"
                >
                  Get Started
                </a>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:ring-2 ring-lime-500">
                  <User className="w-5 h-5" />
                </div>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:text-white hover:bg-rose-400/90"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile toggles */}
          <button
            aria-label="Open Menu"
            className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:text-lime-600"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Fullscreen Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur flex flex-col">
          <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CookingPot className="w-6 h-6 text-black" />
              <span className="font-bold text-gray-900">Recipe Matcher</span>
            </div>
            <button
              aria-label="Close Menu"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:text-lime-600"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="px-6 py-8 flex-1 flex flex-col gap-6">
            {navLinks
              .filter((link) => !['All Recipes', 'My Recipes', 'Create Recipe', 'Pantry'].includes(link.label))
              .map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative text-lg text-gray-800 hover:text-lime-600 underline-animation"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}

            <div className="mt-auto pt-8 border-t border-gray-100 flex flex-col gap-4">
              {!isAuthenticated ? (
                <>
                  <a
                    href="#"
                    className="text-base text-gray-800 hover:text-lime-600"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center justify-center rounded-md bg-lime-500 px-4 py-3 text-base font-medium text-white shadow-lime-glow hover:scale-105"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Started
                  </a>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:ring-2 ring-lime-500">
                    <User className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      onLogout();
                    }}
                    className="inline-flex items-center gap-2 rounded-md px-4 py-3 text-base text-gray-800 hover:text-white hover:bg-rose-400/90"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
