'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useConfig } from '../../../context/ConfigContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useApi } from '../../../hooks/useApi';
import DynamicNavbar from '../../../components/DynamicNavbar';
import DynamicTable from '../../../components/DynamicTable';
import DynamicForm from '../../../components/DynamicForm';
import LoadingState from '../../../components/LoadingState';
import ErrorBoundary from '../../../components/ErrorBoundary';
import { api } from '../../../lib/apiClient';

export default function ResourcePage() {
  const params = useParams();
  const router = useRouter();
  const resource = params.resource as string;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { config } = useConfig();
  const { t } = useLanguage();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [relatedData, setRelatedData] = useState<Record<string, Array<{ id: string; label: string }>>>({});

  // Get entity and page config
  const entityDef = config.database.entities[resource];
  const pageDef = config.ui.pages[resource];

  // API hook
  const {
    data, loading, error, pagination,
    fetch, create, update, remove,
    setPage, setSearch,
  } = useApi<Record<string, unknown>>(`/${resource}`, {
    autoFetch: isAuthenticated && !!entityDef,
    limit: 20,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch related data for foreign key fields
  const fetchRelatedData = useCallback(async () => {
    if (!entityDef) return;
    const newRelated: Record<string, Array<{ id: string; label: string }>> = {};

    for (const [fieldName, field] of Object.entries(entityDef.fields)) {
      if (field.foreignKey) {
        const relEntity = field.foreignKey.entity;
        try {
          const res = await api.get<Record<string, unknown>[]>(`/${relEntity}`, { limit: 100 });
          if (res.success && res.data) {
            const items = res.data as Record<string, unknown>[];
            newRelated[relEntity] = items.map((item) => ({
              id: String(item.id),
              label: String(item.name || item.title || item.email || item.id),
            }));
          }
        } catch { /* ignore */ }
      }
    }
    setRelatedData(newRelated);
  }, [entityDef]);

  useEffect(() => {
    if (isAuthenticated && entityDef) {
      fetchRelatedData();
    }
  }, [isAuthenticated, entityDef, fetchRelatedData]);

  if (authLoading) return <LoadingState />;
  if (!isAuthenticated) return null;

  // Handle missing entity
  if (!entityDef) {
    return (
      <div className="min-h-screen bg-gray-950">
        <DynamicNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Resource Not Found</h2>
          <p className="text-white/40 mb-6">The resource &quot;{resource}&quot; is not defined in the configuration.</p>
          <button onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white/10 text-white/70 rounded-xl hover:bg-white/20 transition-all text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const columns = pageDef?.table?.columns || Object.keys(entityDef.fields).filter(
    (f) => !entityDef.fields[f].auto && f !== 'user_id'
  ).slice(0, 6);

  const formFields = pageDef?.form?.fields || Object.keys(entityDef.fields).filter(
    (f) => !entityDef.fields[f].auto && !entityDef.fields[f].primaryKey
  );

  const handleCreate = async (formData: Record<string, unknown>) => {
    const result = await create(formData);
    if (result.success) {
      setShowForm(false);
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    if (!editItem) return;
    const result = await update(String(editItem.id), formData);
    if (result.success) {
      setEditItem(null);
      setShowForm(false);
    }
  };

  const handleEdit = (item: Record<string, unknown>) => {
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  const title = pageDef?.title ? t(pageDef.title, resource) : resource;

  return (
    <div className="min-h-screen bg-gray-950">
      <DynamicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white capitalize">{title}</h1>
            <p className="text-white/40 text-sm mt-1">
              {pagination ? `${pagination.total} total records` : 'Manage your data'}
            </p>
          </div>
          <button
            onClick={() => { setEditItem(null); setShowForm(!showForm); }}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              showForm
                ? 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
            }`}
          >
            {showForm ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('form.create')}
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={fetch} className="ml-auto underline hover:text-red-300 transition-colors">Retry</button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-8 rounded-2xl bg-white/[0.03] border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-5">
              {editItem ? `${t('form.edit')} ${title}` : `${t('form.create')} ${title}`}
            </h3>
            <ErrorBoundary>
              <DynamicForm
                fields={formFields}
                fieldDefs={entityDef.fields}
                onSubmit={editItem ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditItem(null); }}
                initialData={editItem || undefined}
                isEdit={!!editItem}
                loading={loading}
                entityName={resource}
                relatedData={relatedData}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Table */}
        <ErrorBoundary>
          <DynamicTable
            data={data}
            columns={columns}
            fieldDefs={entityDef.fields}
            loading={loading}
            searchable={pageDef?.table?.searchable || true}
            actions={pageDef?.table?.actions || ['edit', 'delete']}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSearch={setSearch}
            pagination={pagination}
            onPageChange={setPage}
          />
        </ErrorBoundary>
      </main>
    </div>
  );
}
