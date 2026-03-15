'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CheckSquare, LayoutDashboard, LogOut, Settings, User } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/authApi';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      router.push('/auth/login');
      toast.success('Logged out successfully');
    }
  };

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-slate-100 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
          <CheckSquare className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-lg tracking-tight">TaskFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-brand-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
