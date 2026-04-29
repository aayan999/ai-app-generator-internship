'use client';

import React, { useState, useEffect } from 'react';
import { FieldDef } from '../lib/configParser';
import { useLanguage } from '../context/LanguageContext';

interface DynamicFormProps {
  fields: string[];
  fieldDefs: Record<string, FieldDef>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  initialData?: Record<string, unknown>;
  isEdit?: boolean;
  loading?: boolean;
  entityName?: string;
  /** For foreign key dropdowns — provides label/value options */
  relatedData?: Record<string, Array<{ id: string; label: string }>>;
}

export default function DynamicForm({
  fields,
  fieldDefs,
  onSubmit,
  onCancel,
  initialData,
  isEdit = false,
  loading = false,
  entityName = '',
  relatedData = {},
}: DynamicFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initial: Record<string, unknown> = {};
    for (const fieldName of fields) {
      const fieldDef = fieldDefs[fieldName];
      if (!fieldDef) continue;
      if (initialData?.[fieldName] !== undefined) {
        initial[fieldName] = initialData[fieldName];
      } else if (fieldDef.default !== undefined) {
        initial[fieldName] = fieldDef.default;
      } else {
        initial[fieldName] = '';
      }
    }
    setFormData(initial);
  }, [fields, fieldDefs, initialData]);

  const handleChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const fieldName of fields) {
      const fieldDef = fieldDefs[fieldName];
      if (!fieldDef) continue;
      const value = formData[fieldName];
      if (fieldDef.required && !isEdit && (value === '' || value === undefined || value === null)) {
        newErrors[fieldName] = `${fieldName} is required`;
      }
      if (fieldDef.maxLength && typeof value === 'string' && value.length > fieldDef.maxLength) {
        newErrors[fieldName] = `Maximum ${fieldDef.maxLength} characters`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const cleanData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== '' && value !== undefined) {
          cleanData[key] = value;
        }
      }
      await onSubmit(cleanData);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (fieldName: string) => {
    const fieldDef = fieldDefs[fieldName];
    if (!fieldDef || fieldDef.auto || fieldDef.primaryKey) return null;

    const value = formData[fieldName] ?? '';
    const error = errors[fieldName];
    const label = fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const baseInputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 ${
      error
        ? 'border-red-500/50 bg-red-500/5 focus:ring-red-500/30'
        : 'border-white/10 bg-white/5 focus:ring-indigo-500/30 focus:border-indigo-500/50 hover:border-white/20'
    } text-white placeholder-white/30`;

    if (fieldDef.foreignKey) {
      const options = relatedData[fieldDef.foreignKey.entity] || [];
      return (
        <div key={fieldName} className="space-y-2">
          <label className="block text-sm font-medium text-white/70">{label}</label>
          <select value={String(value)} onChange={(e) => handleChange(fieldName, e.target.value)} className={baseInputClass + ' appearance-none cursor-pointer'}>
            <option value="" className="bg-gray-900">Select {label}...</option>
            {options.map((opt) => <option key={opt.id} value={opt.id} className="bg-gray-900">{opt.label}</option>)}
          </select>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    if (fieldDef.type === 'enum' && fieldDef.values) {
      return (
        <div key={fieldName} className="space-y-2">
          <label className="block text-sm font-medium text-white/70">{label}</label>
          <select value={String(value)} onChange={(e) => handleChange(fieldName, e.target.value)} className={baseInputClass + ' appearance-none cursor-pointer'}>
            <option value="" className="bg-gray-900">Select {label}...</option>
            {fieldDef.values.map((v) => <option key={v} value={v} className="bg-gray-900">{v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
          </select>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    if (fieldDef.type === 'boolean' || fieldDef.type === 'bool') {
      return (
        <div key={fieldName} className="flex items-center gap-3 py-2">
          <button type="button" onClick={() => handleChange(fieldName, !value)} className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-indigo-500' : 'bg-white/10'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${value ? 'translate-x-6' : ''}`} />
          </button>
          <label className="text-sm font-medium text-white/70">{label}</label>
        </div>
      );
    }

    if (fieldDef.type === 'text') {
      return (
        <div key={fieldName} className="space-y-2">
          <label className="block text-sm font-medium text-white/70">{label}</label>
          <textarea value={String(value)} onChange={(e) => handleChange(fieldName, e.target.value)} rows={4} className={baseInputClass + ' resize-none'} placeholder={`Enter ${label.toLowerCase()}...`} />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    if (fieldDef.type === 'date') {
      return (
        <div key={fieldName} className="space-y-2">
          <label className="block text-sm font-medium text-white/70">{label}</label>
          <input type="date" value={value ? String(value).substring(0, 10) : ''} onChange={(e) => handleChange(fieldName, e.target.value)} className={baseInputClass} />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    if (['integer', 'int', 'decimal', 'float', 'number'].includes(fieldDef.type)) {
      return (
        <div key={fieldName} className="space-y-2">
          <label className="block text-sm font-medium text-white/70">{label}</label>
          <input type="number" value={value === '' ? '' : Number(value)} onChange={(e) => handleChange(fieldName, e.target.value === '' ? '' : Number(e.target.value))} step={fieldDef.type === 'integer' || fieldDef.type === 'int' ? '1' : '0.01'} className={baseInputClass} placeholder={`Enter ${label.toLowerCase()}...`} />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    if (fieldDef.type === 'json' || fieldDef.type === 'array') {
      return (
        <div key={fieldName} className="space-y-2">
          <label className="block text-sm font-medium text-white/70">{label} (JSON)</label>
          <textarea value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)} onChange={(e) => { try { handleChange(fieldName, JSON.parse(e.target.value)); } catch { handleChange(fieldName, e.target.value); } }} rows={3} className={baseInputClass + ' font-mono text-sm resize-none'} placeholder='["tag1", "tag2"]' />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    return (
      <div key={fieldName} className="space-y-2">
        <label className="block text-sm font-medium text-white/70">{label}{fieldDef.required && <span className="text-red-400 ml-1">*</span>}</label>
        <input type={fieldDef.type === 'email' ? 'email' : 'text'} value={String(value)} onChange={(e) => handleChange(fieldName, e.target.value)} maxLength={fieldDef.maxLength} className={baseInputClass} placeholder={`Enter ${label.toLowerCase()}...`} />
        {fieldDef.maxLength && <p className="text-white/20 text-xs text-right">{String(value).length}/{fieldDef.maxLength}</p>}
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{fields.map((fieldName) => renderField(fieldName))}</div>
      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
        <button type="submit" disabled={submitting || loading} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40">
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              {t('form.submit')}...
            </span>
          ) : isEdit ? t('form.save') : t('form.create')}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-6 py-3 bg-white/5 text-white/70 font-medium rounded-xl hover:bg-white/10 hover:text-white transition-all duration-200 border border-white/10">{t('form.cancel')}</button>}
      </div>
    </form>
  );
}
