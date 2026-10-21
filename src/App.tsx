import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  Flag,
  ListTodo,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { supabase, type Priority, type Todo } from '@/lib/supabase';

type Filter = 'all' | 'active' | 'completed';

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; ring: string; dot: string; badge: string; flag: string }
> = {
  high: {
    label: 'High',
    ring: 'focus-within:ring-purple-400/60',
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    flag: 'text-purple-400',
  },
  medium: {
    label: 'Medium',
    ring: 'focus-within:ring-purple-500/40',
    dot: 'bg-purple-500',
    badge: 'bg-purple-500/10 text-purple-300/90 border-purple-500/20',
    flag: 'text-purple-500',
  },
  low: {
    label: 'Low',
    ring: 'focus-within:ring-purple-600/30',
    dot: 'bg-purple-600',
    badge: 'bg-purple-600/10 text-purple-300/70 border-purple-600/20',
    flag: 'text-purple-600',
  },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Done' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [optimisticIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('todos')
      .select('*')
      .order('completed_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false });

    if (err) {
      setError('Görevler yüklenemedi.');
      return;
    }
    setTodos((data ?? []) as Todo[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchTodos();
      setLoading(false);
    })();
  }, [fetchTodos]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('todos')
      .insert({ title: trimmed, priority })
      .select()
      .single();

    if (err) {
      setError('Görev eklenemedi.');
      setSubmitting(false);
      return;
    }
    setTodos((prev) => [data as Todo, ...prev]);
    setTitle('');
    setPriority('medium');
    setSubmitting(false);
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const next = !completed;
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: next,
              completed_at: next ? new Date().toISOString() : null,
            }
          : t
      )
    );
    const { error: err } = await supabase
      .from('todos')
      .update({
        completed: next,
        completed_at: next ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (err) {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, completed, completed_at: completed ? t.completed_at : null }
            : t
        )
      );
      setError('Durum güncellenemedi.');
    }
  };

  const deleteTodo = async (id: string) => {
    const prev = todos;
    setTodos((cur) => cur.filter((t) => t.id !== id));
    const { error: err } = await supabase.from('todos').delete().eq('id', id);
    if (err) {
      setTodos(prev);
      setError('Görev silinemedi.');
    }
  };

  const clearCompleted = async () => {
    const completed = todos.filter((t) => t.completed);
    if (completed.length === 0) return;
    const prev = todos;
    setTodos((cur) => cur.filter((t) => !t.completed));
    const { error: err } = await supabase
      .from('todos')
      .delete()
      .in(
        'id',
        completed.map((t) => t.id)
      );
    if (err) {
      setTodos(prev);
      setError('Tamamlanan görevler temizlenemedi.');
    }
  };

  const filtered = useMemo(() => {
    const active = todos.filter((t) => !t.completed);
    const done = todos.filter((t) => t.completed);
    if (filter === 'active') return active;
    if (filter === 'completed') return done;
    return [...active, ...done];
  }, [todos, filter]);

  const stats = useMemo(() => {
    const total = todos.length;
    const done = todos.filter((t) => t.completed).length;
    const active = total - done;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, active, pct };
  }, [todos]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-gray-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-purple-600/20 blur-[120px] animate-glow" />
        <div
          className="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-purple-800/20 blur-[120px] animate-glow"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <header className="mb-8 animate-fade-slide-in">
          <div className="mb-5 flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-800 shadow-lg shadow-purple-900/40">
              <ListTodo className="h-5 w-5 text-white" strokeWidth={2.5} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.7rem]">
                Tasks
              </h1>
              <p className="text-sm text-gray-400">
                {stats.active > 0
                  ? `${stats.active} active task${stats.active > 1 ? 's' : ''}`
                  : 'All clear'}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>Progress</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-white">
                {stats.done}
                <span className="text-gray-500"> / {stats.total}</span>
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-[width] duration-500 ease-out"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </div>
        </header>

        {/* Add form */}
        <form
          onSubmit={addTodo}
          className="mb-6 animate-fade-slide-in"
          style={{ animationDelay: '60ms' }}
        >
          <div
            className={`flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 shadow-xl shadow-black/30 ring-1 ring-transparent transition focus-within:bg-white/[0.05] focus-within:ring-2 ${PRIORITY_CONFIG[priority].ring}`}
          >
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white transition hover:from-purple-400 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:from-purple-500 disabled:hover:to-purple-700"
              aria-label="Add task"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              )}
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a new task..."
              className="min-w-0 flex-1 bg-transparent px-1 text-[15px] text-white placeholder:text-gray-500 focus:outline-none"
              maxLength={200}
            />
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-black/30 p-1">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    priority === p
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title={`${PRIORITY_CONFIG[p].label} priority`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${PRIORITY_CONFIG[p].dot}`}
                  />
                  <span className="hidden sm:inline">{PRIORITY_CONFIG[p].label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Filters */}
        <div
          className="mb-5 flex items-center justify-between animate-fade-slide-in"
          style={{ animationDelay: '120ms' }}
        >
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            {FILTERS.map((f) => {
              const count =
                f.key === 'all'
                  ? stats.total
                  : f.key === 'active'
                    ? stats.active
                    : stats.done;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                    filter === f.key
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {f.label}
                  <span className="ml-1.5 text-xs tabular-nums text-gray-500">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {stats.done > 0 && (
            <button
              onClick={clearCompleted}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition hover:bg-white/[0.04] hover:text-gray-200"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear done</span>
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 animate-fade-in rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-200"
            >
              <X className="inline h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              <span className="text-sm">Loading tasks...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <ul className="space-y-2">
              {filtered.map((todo, i) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  index={i}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  optimistic={optimisticIds.has(todo.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-10 flex items-center justify-center gap-1.5 text-xs text-gray-600">
          <span>Saved automatically</span>
          <span className="h-1 w-1 rounded-full bg-gray-700" />
          <span>{stats.total} total</span>
        </footer>
      </main>
    </div>
  );
}

function TodoItem({
  todo,
  index,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  index: number;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  optimistic: boolean;
}) {
  const cfg = PRIORITY_CONFIG[todo.priority];
  return (
    <li
      className={`group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 backdrop-blur-sm transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04] animate-fade-slide-in ${
        todo.completed ? 'opacity-55' : ''
      }`}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo.id, todo.completed)}
        className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
          todo.completed
            ? 'border-purple-500 bg-purple-500'
            : 'border-white/20 hover:border-purple-400'
        }`}
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.completed && (
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[15px] transition ${
            todo.completed
              ? 'text-gray-500 line-through decoration-gray-600'
              : 'text-gray-100'
          }`}
        >
          {todo.title}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${cfg.badge}`}
          >
            <Flag className={`h-2.5 w-2.5 ${cfg.flag}`} />
            {cfg.label}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(todo.created_at)}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(todo.id)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const content =
    filter === 'completed'
      ? {
          icon: CheckCheck,
          title: 'Nothing completed yet',
          sub: 'Finished tasks will show up here.',
        }
      : filter === 'active'
        ? {
            icon: Sparkles,
            title: 'No active tasks',
            sub: "You're all caught up. Add one above.",
          }
        : {
            icon: ListTodo,
            title: 'No tasks yet',
            sub: 'Add your first task to get started.',
          };
  const Icon = content.icon;
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-purple-400/70">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-base font-medium text-gray-300">{content.title}</p>
        <p className="mt-1 text-sm text-gray-500">{content.sub}</p>
      </div>
    </div>
  );
}
