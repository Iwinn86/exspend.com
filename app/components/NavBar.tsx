'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  HelpCircle,
  FileText,
  LogOut,
  User,
  Menu,
  X,
  Settings,
} from 'lucide-react';
import { getCurrentUser, logout, ADMIN_EMAIL } from '@/app/lib/auth';
import NotificationBell from '@/app/components/NotificationBell';

const navItems = [
  { icon: ShoppingCart, label: 'Spend', href: '/spend' },
  { icon: TrendingUp, label: 'Buy', href: '/buy' },
  { icon: TrendingDown, label: 'Sell', href: '/sell' },
  { icon: ClipboardList, label: 'Orders', href: '/orders' },
  { icon: HelpCircle, label: 'Help', href: '/help' },
  { icon: FileText, label: 'Policies', href: '/policies' },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  const firstName = user?.name?.split(' ')[0] ?? null;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="bg-green-900 text-white px-6 py-3">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-bold text-2xl flex items-center gap-1">
          {logoError ? (
            <>
              <span className="text-lime-400">Ex</span>
              <span>spend</span>
              <span className="ml-1">⚡</span>
            </>
          ) : (
            <img
              src="/logo.png"
              alt="Exspend"
              className="h-16 w-auto"
              onError={() => setLogoError(true)}
            />
          )}
        </Link>

        <div className="hidden md:flex gap-1 items-center">
          {user ? (
            <>
              {navItems.map(({ icon: Icon, label, href }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                      active
                        ? 'text-lime-400 bg-green-800'
                        : 'text-white hover:text-lime-400 hover:bg-green-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </Link>
                );
              })}

              {user?.email === ADMIN_EMAIL && (
                <Link
                  href="/admin"
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                    pathname.startsWith('/admin')
                      ? 'text-lime-400 bg-green-800'
                      : 'text-white hover:text-lime-400 hover:bg-green-800'
                  }`}
                >
                  <Settings size={20} />
                  <span>Admin</span>
                </Link>
              )}

              <NotificationBell />

              {firstName && (
                <Link
                  href="/profile"
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-lime-300 hover:text-lime-100 hover:bg-green-800"
                >
                  <User size={20} />
                  <span>{firstName}</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-white hover:text-lime-400 hover:bg-green-800"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:text-lime-400 hover:bg-green-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-lg text-sm font-medium bg-lime-400 hover:bg-lime-300 text-green-900 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-green-800 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden mt-2 flex flex-col gap-1 pb-2">
          {user ? (
            <>
              {navItems.map(({ icon: Icon, label, href }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      active
                        ? 'text-lime-400 bg-green-800'
                        : 'text-white hover:text-lime-400 hover:bg-green-800'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                );
              })}

              {firstName && (
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-lime-300 hover:text-lime-100 hover:bg-green-800"
                >
                  <User size={18} />
                  <span>{firstName}</span>
                </Link>
              )}

              {user?.email === ADMIN_EMAIL && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    pathname.startsWith('/admin')
                      ? 'text-lime-400 bg-green-800'
                      : 'text-white hover:text-lime-400 hover:bg-green-800'
                  }`}
                >
                  <Settings size={18} />
                  <span>Admin</span>
                </Link>
              )}

              <div className="px-1">
                <NotificationBell />
              </div>

              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white hover:text-lime-400 hover:bg-green-800"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white hover:text-lime-400 hover:bg-green-800"
              >
                <User size={18} />
                <span>Sign In</span>
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-lime-400 hover:bg-lime-300 text-green-900 mx-4 rounded-lg"
              >
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}