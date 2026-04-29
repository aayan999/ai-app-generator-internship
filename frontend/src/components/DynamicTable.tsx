'use client';

import React, { useState } from 'react';
import { FieldDef } from '../lib/configParser';
import { useLanguage } from '../context/LanguageContext';

interface DynamicTableProps {
  data: Record<string, unknown>[];
  columns: string[];
  fieldDefs: Record<string, FieldDef>;
  loading?: boolean;
  searchable?: boolean;
  actions?: string[];
  onEdit?: (item: Record<string, unknown>) => void;
  onDelete?: (id: string) => void;
  onSearch?: (query: string) => void;
  pagination?: { page: number; limit: number; total: number; totalPages: number } | null;
  onPageChange?: (page: number) => void;
}

export default function DynamicTable({
  data, columns, fieldDefs, loading, searchable, actions = [],
  onEdit, onDelete, onSearch, pagination, onPageChange,
}: DynamicTableProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const formatValue = (value: unknown, fieldDef?: FieldDef): string => {
    if (value === null || value === undefined) return '—';
    if (fieldDef?.type === 'date' || fieldDef?.type === 'timestamp') {
      try { return new Date(String(value)).toLocaleDateString(); } catch { return String(value); }
    }
    if (fieldDef?.type === 'json' || fieldDef?.type === 'array') {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed.join(', ') : JSON.stringify(parsed);
      } catch { return String(value); }
    }
    if (fieldDef?.type === 'decimal' || fieldDef?.type === 'float') {
      return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 });
    }
    if (fieldDef?.type === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const getStatusColor = (value: unknown): string => {
    const v = String(value).toLowerCase();
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      planning: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      todo: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      on_hold: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      archived: 'bg-gray-600/20 text-gray-500 border-gray-600/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      critical: 'bg-red-600/20 text-red-300 border-red-600/30',
      urgent: 'bg-red-600/20 text-red-300 border-red-600/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return colors[v] || 'bg-white/10 text-white/60 border-white/10';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={searchQuery} onChange={handleSearch}
            placeholder={t('form.search')}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {columns.map((col) => (
                  <th key={col} className="px-5 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-5 py-4 text-right text-xs font-semibold text-white/50 uppercase tracking-wider">
                    {t('table.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="px-5 py-12 text-center text-white/30">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>{t('table.noData')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={String(item.id || idx)} className="hover:bg-white/[0.03] transition-colors">
                    {columns.map((col) => {
                      const fieldDef = fieldDefs[col];
                      const value = item[col];
                      const isEnum = fieldDef?.type === 'enum';
                      return (
                        <td key={col} className="px-5 py-4 text-sm text-white/80 whitespace-nowrap">
                          {isEnum ? (
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(value)}`}>
                              {String(value || '—').replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="truncate max-w-[200px] inline-block">
                              {formatValue(value, fieldDef)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {actions.length > 0 && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {actions.includes('edit') && onEdit && (
                            <button onClick={() => onEdit(item)}
                              className="p-2 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                              title={t('form.edit')}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {actions.includes('delete') && onDelete && (
                            deleteConfirm === String(item.id) ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => { onDelete(String(item.id)); setDeleteConfirm(null); }}
                                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all">
                                  Confirm
                                </button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs bg-white/5 text-white/40 rounded-lg hover:bg-white/10 transition-all">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(String(item.id))}
                                className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title={t('form.delete')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-white/40">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={pagination.page <= 1} onClick={() => onPageChange?.(pagination.page - 1)}
              className="px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum > pagination.totalPages) return null;
              return (
                <button key={pageNum} onClick={() => onPageChange?.(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    pageNum === pagination.page
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}>
                  {pageNum}
                </button>
              );
            })}
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange?.(pagination.page + 1)}
              className="px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
