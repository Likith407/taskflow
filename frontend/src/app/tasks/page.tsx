'use client';

import { useCallback, useEffect, useState } from 'react';
import { tasksApi } from '@/lib/tasksApi';
import { Task, TaskFilters, CreateTaskInput, PaginationMeta, TaskStatus } from '@/types';
import { TaskModal } from '@/components/ui/TaskModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, Clock, Archive, Calendar, Tag
} from 'lucide-react';
import { formatDistanceToNow, format, isValid } from 'date-fns';

const STATUS_OPTIONS: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusIcon = {
  todo: <Circle className="w-3.5 h-3.5 text-slate-400" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  archived: <Archive className="w-3.5 h-3.5 text-purple-400" />,
};

const statusBadge: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-purple-100 text-purple-700',
};

const priorityBadge: Record<string, string> = {
  low: 'bg-green-50 text-green-700',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFilters>({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tasksApi.getAll(filters);
      setTasks(res.data ?? []);
      setMeta(res.meta ?? null);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSave = async (data: CreateTaskInput) => {
    try {
      if (editingTask) {
        await tasksApi.update(editingTask._id, data);
        toast.success('Task updated');
      } else {
        await tasksApi.create(data);
        toast.success('Task created');
      }
      setShowModal(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save task');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    setDeleteLoading(true);
    try {
      await tasksApi.delete(deletingTask._id);
      toast.success('Task deleted');
      setDeletingTask(null);
      fetchTasks();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    try {
      await tasksApi.update(task._id, { status });
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status } : t));
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">{meta ? `${meta.total} task${meta.total !== 1 ? 's' : ''}` : 'Manage your work'}</p>
        </div>
        <button onClick={() => { setEditingTask(null); setShowModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search tasks..." className="input-field pl-9" />
        </div>
        <select value={filters.status ?? ''} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as any, page: 1 }))} className="input-field w-40">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.priority ?? ''} onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value as any, page: 1 }))} className="input-field w-40">
          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={`${filters.sortBy}-${filters.sortOrder}`} onChange={(e) => { const [sortBy, sortOrder] = e.target.value.split('-'); setFilters(f => ({ ...f, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 })); }} className="input-field w-44">
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="dueDate-asc">Due date (asc)</option>
          <option value="priority-desc">Priority (high)</option>
          <option value="title-asc">Title (A–Z)</option>
        </select>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />)}</div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">No tasks found.</p>
            <button onClick={() => { setEditingTask(null); setShowModal(true); }} className="text-brand-600 text-sm hover:underline mt-1">Create your first task →</button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 w-8"></th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Title</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3 hidden md:table-cell">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3 hidden lg:table-cell">Priority</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3 hidden xl:table-cell">Due</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3 hidden xl:table-cell">Created</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3.5">{statusIcon[task.status]}</td>
                    <td className="px-3 py-3.5">
                      <div>
                        <p className="font-medium text-slate-800">{task.title}</p>
                        {task.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{task.description}</p>}
                        {task.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Tag className="w-2.5 h-2.5 text-slate-300" />
                            {task.tags.slice(0, 3).map(t => <span key={t} className="text-xs text-slate-400">{t}</span>)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <select value={task.status} onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)} className={`badge ${statusBadge[task.status]} border-0 cursor-pointer text-xs font-medium pr-5`} style={{ backgroundImage: 'none' }}>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="px-3 py-3.5 hidden lg:table-cell"><span className={`badge ${priorityBadge[task.priority]}`}>{task.priority}</span></td>
                    <td className="px-3 py-3.5 hidden xl:table-cell text-slate-500">
                      {task.dueDate && isValid(new Date(task.dueDate)) ? (
                        <span className="flex items-center gap-1 text-xs"><Calendar className="w-3 h-3" />{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3.5 hidden xl:table-cell text-xs text-slate-400">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingTask(task); setShowModal(true); }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeletingTask(task)} className="p-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
                <p className="text-xs text-slate-400">Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))} disabled={!meta.hasPrevPage} className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                  {[...Array(meta.totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setFilters(f => ({ ...f, page: i + 1 }))} className={`w-7 h-7 text-xs rounded-md font-medium transition-colors ${meta.page === i + 1 ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))} disabled={!meta.hasNextPage} className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showModal && <TaskModal task={editingTask} onClose={() => { setShowModal(false); setEditingTask(null); }} onSave={handleSave} />}
      {deletingTask && <ConfirmDialog title="Delete task" message={`Are you sure you want to delete "${deletingTask.title}"? This action cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeletingTask(null)} loading={deleteLoading} />}
    </div>
  );
}