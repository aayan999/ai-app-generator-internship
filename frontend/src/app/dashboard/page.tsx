'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useLanguage } from '../../context/LanguageContext';
import DynamicNavbar from '../../components/DynamicNavbar';
import LoadingState from '../../components/LoadingState';
import { api } from '../../lib/apiClient';

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { config } = useConfig();
  const { t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentTasks, setRecentTasks] = useState<Record<string, unknown>[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    const entities = Object.keys(config.database.entities);
    const newStats: Record<string, number> = {};

    for (const entity of entities) {
      try {
        const res = await api.get<{ count: number }>(`/${entity}/count`);
        if (res.success && res.data) {
          newStats[entity] = (res.data as { count: number }).count;
        }
      } catch {
        newStats[entity] = 0;
      }
    }
    setStats(newStats);

    // Fetch recent tasks if available
    if (config.database.entities['tasks']) {
      try {
        const res = await api.get<Record<string, unknown>[]>('/tasks', { limit: 5, sort: 'created_at', order: 'DESC' });
        if (res.success && res.data) {
          setRecentTasks(res.data as Record<string, unknown>[]);
        }
      } catch { /* ignore */ }
    }

    setLoadingStats(false);
  }, [config.database.entities]);

  useEffect(() => {
    if (isAuthenticated) fetchStats();
  }, [isAuthenticated, fetchStats]);

  const handleExport = async () => {
    setExportLoading(true);
    setExportResult(null);
    try {
      const repoName = config.app.name.toLowerCase().replace(/\s+/g, '-');
      const res = await api.exportToGithub(repoName, config.app.description, true);
      if (res.success && res.data) {
        setExportResult({ success: true, url: (res.data as { url: string }).url });
      } else {
        setExportResult({ success: false, error: res.error?.message || 'Export failed' });
      }
    } catch (err) {
      setExportResult({ success: false, error: 'Export failed' });
    }
    setExportLoading(false);
  };

  if (authLoading) return <LoadingState />;
  if (!isAuthenticated) return null;

  const entities = Object.keys(config.database.entities);

  const getStatusColor = (v: string): string => {
    const colors: Record<string, string> = {
      todo: 'bg-gray-500/20 text-gray-400',
      in_progress: 'bg-blue-500/20 text-blue-400',
      review: 'bg-yellow-500/20 text-yellow-400',
      done: 'bg-emerald-500/20 text-emerald-400',
    };
    return colors[v] || 'bg-white/10 text-white/60';
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <DynamicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            {t('common.welcome')}, {user?.name || user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-white/40">{t('app.subtitle', config.app.description)}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {entities.map((entity) => {
            const icon = entity === 'projects' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            );

            return (
              <button key={entity} onClick={() => router.push(`/dashboard/${entity}`)}
                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all duration-300 text-left">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                    {icon}
                  </div>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {loadingStats ? (
                      <span className="inline-block w-8 h-8 bg-white/10 rounded-lg animate-pulse" />
                    ) : (
                      stats[entity] ?? 0
                    )}
                  </p>
                  <p className="text-sm text-white/40 capitalize">{t(`nav.${entity}`, entity)}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Recent Tasks + Export */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tasks */}
          <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white">Recent Tasks</h2>
            </div>
            <div className="divide-y divide-white/5">
              {recentTasks.length === 0 ? (
                <div className="px-6 py-12 text-center text-white/30 text-sm">
                  No tasks yet. Create one to get started!
                </div>
              ) : (
                recentTasks.map((task, i) => (
                  <div key={String(task.id || i)} className="px-6 py-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{String(task.title || 'Untitled')}</p>
                      <p className="text-xs text-white/30 mt-0.5">
                        {task.due_date ? new Date(String(task.due_date)).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                    <span className={`ml-3 px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(String(task.status || ''))}`}>
                      {String(task.status || 'unknown').replace(/_/g, ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GitHub Export */}
          {config.export.github.enabled && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-white/5">
                  <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">{t('export.github')}</h2>
              </div>
              <p className="text-sm text-white/40 mb-6">
                Export this project's full codebase to a GitHub repository.
              </p>
              <button onClick={handleExport} disabled={exportLoading}
                className="w-full py-3 px-4 bg-white/5 border border-white/10 text-white/70 font-medium rounded-xl hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {exportLoading ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Exporting...</>
                ) : (
                  <>{t('export.github')}</>
                )}
              </button>
              {exportResult && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${exportResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {exportResult.success ? (
                    <a href={exportResult.url} target="_blank" rel="noopener noreferrer" className="underline">{t('export.success')} View →</a>
                  ) : (
                    exportResult.error || t('export.error')
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
