'use client';

import { useEffect, useState } from 'react';
import { tasksApi } from '@/lib/tasksApi';
import { useAuthStore } from '@/lib/store';
import { TaskStats, Task } from '@/types';
import { CheckCircle2, Circle, Clock, Archive, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const statCards = [
  { key: 'total',       label: 'Total Tasks',    icon: TrendingUp,   color: 'bg-brand-50 text-brand-700' },
  { key: 'todo',        label: 'To Do',          icon: Circle,       color: 'bg-slate-50 text-slate-600' },
  { key: 'in_progress', label: 'In Progress',    icon: Clock,        color: 'bg-amber-50 text-amber-700' },
  { key: 'completed',   label: 'Completed',      icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700' },
  { key: 'archived',    label: 'Archived',       icon: Archive,      color: 'bg-purple-50 text-purple-700' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [recent, setRecent] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      tasksApi.getStats(),
      tasksApi.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
    ]).then(([statsRes, tasksRes]) => {
      setStats(statsRes.data ?? null);
      setRecent(tasksRes.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statusBadge: Record<string, string> = {
    todo:        'bg-slate-100 text-slate-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed:   'bg-emerald-100 text-emerald-700',
    archived:    'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          {greeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's an overview of your tasks.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="card p-4 animate-slide-up">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? <span className="w-8 h-6 bg-slate-100 rounded animate-pulse inline-block" /> : (stats?.[key as keyof TaskStats] ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      {stats && stats.total > 0 && (
        <div className="card p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Overall Progress</h2>
            <span className="text-sm font-medium text-brand-600">
              {Math.round((stats.completed / stats.total) * 100)}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${(stats.completed / stats.total) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
            <span>{stats.completed} completed</span>
            <span>{stats.total - stats.completed} remaining</span>
          </div>
        </div>
      )}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Recent Tasks</h2>
          <Link href="/tasks" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No tasks yet. <Link href="/tasks" className="text-brand-600 hover:underline">Create your first task →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {recent.map((task) => (
              <li key={task._id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`badge ${statusBadge[task.status]}`}>{task.status.replace('_', ' ')}</span>
                  <span className="text-sm text-slate-700 truncate">{task.title}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0 ml-3">
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
