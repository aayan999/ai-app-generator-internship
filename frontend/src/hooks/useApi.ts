'use client';

import { useState, useCallback, useEffect } from 'react';
import { api, ApiResponse } from '../lib/apiClient';

interface UseApiOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  search?: string;
  filters?: Record<string, string | number | undefined>;
  autoFetch?: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UseApiReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  fetch: () => Promise<void>;
  create: (body: Partial<T>) => Promise<{ success: boolean; data?: T; error?: string }>;
  update: (id: string, body: Partial<T>) => Promise<{ success: boolean; data?: T; error?: string }>;
  remove: (id: string) => Promise<{ success: boolean; error?: string }>;
  getById: (id: string) => Promise<{ success: boolean; data?: T; error?: string }>;
  count: () => Promise<{ success: boolean; count?: number; error?: string }>;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setFilters: (filters: Record<string, string | number | undefined>) => void;
}

/**
 * Generic hook for CRUD operations on any entity endpoint.
 * Handles loading states, errors, pagination, search, and filtering.
 */
export function useApi<T = Record<string, unknown>>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const {
    page: initialPage = 1,
    limit = 20,
    sort,
    order,
    search: initialSearch = '',
    filters: initialFilters = {},
    autoFetch = true,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit,
        sort,
        order,
        search: search || undefined,
        ...filters,
      };

      const response = await api.get<T[]>(endpoint, params);

      if (response.success) {
        setData((response as ApiResponse<T[]> & { data: T[] }).data || []);
        if ((response as { pagination?: PaginationInfo }).pagination) {
          setPagination((response as { pagination: PaginationInfo }).pagination);
        }
      } else {
        setError(response.error?.message || 'Failed to fetch data');
        setData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, limit, sort, order, search, filters]);

  const create = useCallback(
    async (body: Partial<T>) => {
      try {
        const response = await api.post<T>(endpoint, body);
        if (response.success) {
          await fetch(); // Refresh the list
          return { success: true, data: response.data as T };
        }
        return { success: false, error: response.error?.message || 'Create failed' };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Create failed' };
      }
    },
    [endpoint, fetch]
  );

  const update = useCallback(
    async (id: string, body: Partial<T>) => {
      try {
        const response = await api.put<T>(`${endpoint}/${id}`, body);
        if (response.success) {
          await fetch(); // Refresh the list
          return { success: true, data: response.data as T };
        }
        return { success: false, error: response.error?.message || 'Update failed' };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
      }
    },
    [endpoint, fetch]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        const response = await api.delete(`${endpoint}/${id}`);
        if (response.success) {
          await fetch(); // Refresh the list
          return { success: true };
        }
        return { success: false, error: response.error?.message || 'Delete failed' };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
      }
    },
    [endpoint, fetch]
  );

  const getById = useCallback(
    async (id: string) => {
      try {
        const response = await api.get<T>(`${endpoint}/${id}`);
        if (response.success) {
          return { success: true, data: response.data as T };
        }
        return { success: false, error: response.error?.message || 'Not found' };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Fetch failed' };
      }
    },
    [endpoint]
  );

  const count = useCallback(async () => {
    try {
      const response = await api.get<{ count: number }>(`${endpoint}/count`);
      if (response.success && response.data) {
        return { success: true, count: (response.data as { count: number }).count };
      }
      return { success: false, error: response.error?.message || 'Count failed' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Count failed' };
    }
  }, [endpoint]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  return {
    data,
    loading,
    error,
    pagination,
    fetch,
    create,
    update,
    remove,
    getById,
    count,
    setPage,
    setSearch,
    setFilters,
  };
}
