'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ComparePage() {
  const [salaries, setSalaries] = useState<any[]>([]);
  const [selected1, setSelected1] = useState('');
  const [selected2, setSelected2] = useState('');
  const [comparison, setComparison] = useState<any>(null);

  // Fetch all salaries to populate dropdowns (in a real app, use search with autocomplete)
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${API_BASE}/api/v1/salaries`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setSalaries(data.data);
      });
  }, []);

  const handleCompare = async () => {
    if (!selected1 || !selected2) return;
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/v1/compare?salaryId1=${selected1}&salaryId2=${selected2}`);
      const json = await res.json();
      if (json.success) {
        setComparison(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <Link href="/" className="text-neutral-500 hover:text-white transition-colors block mb-2 text-sm">
              ← Back to List
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Compare Offers</h1>
          </div>
        </header>

        <section className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Offer 1</label>
            <select 
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={selected1}
              onChange={(e) => setSelected1(e.target.value)}
            >
              <option value="">Select a salary...</option>
              {salaries.map(s => (
                <option key={s.id} value={s.id}>
                  {s.company.toUpperCase()} - {s.role} ({s.level}) - ${s.total_compensation.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Offer 2</label>
            <select 
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={selected2}
              onChange={(e) => setSelected2(e.target.value)}
            >
              <option value="">Select a salary...</option>
              {salaries.map(s => (
                <option key={s.id} value={s.id}>
                  {s.company.toUpperCase()} - {s.role} ({s.level}) - ${s.total_compensation.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleCompare}
            disabled={!selected1 || !selected2}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md font-medium transition-colors w-full md:w-auto"
          >
            Compare
          </button>
        </section>

        {comparison && (
          <section className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-neutral-700 bg-neutral-900">
              <h2 className="text-xl font-bold">
                <span className="capitalize text-emerald-400">{comparison.salary1.company}</span> vs <span className="capitalize text-emerald-400">{comparison.salary2.company}</span>
              </h2>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4 text-center items-center">
              
              {/* Columns Header */}
              <div className="font-semibold text-neutral-400">Metric</div>
              <div className="font-bold text-white capitalize">{comparison.salary1.company} ({comparison.salary1.level})</div>
              <div className="font-bold text-white capitalize">{comparison.salary2.company} ({comparison.salary2.level})</div>

              {/* Total Comp */}
              <div className="text-sm font-medium text-neutral-400 py-3 border-t border-neutral-700/50">Total Compensation</div>
              <div className="text-lg font-bold py-3 border-t border-neutral-700/50 text-white">
                ${(comparison.salary1.total_compensation ?? 0).toLocaleString()}
              </div>
              <div className="text-lg font-bold py-3 border-t border-neutral-700/50 text-white">
                ${(comparison.salary2.total_compensation ?? 0).toLocaleString()}
                <span className={`block text-xs mt-1 ${comparison.total_difference < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {comparison.total_difference < 0 ? '+' : '-'}${Math.abs(comparison.total_difference).toLocaleString()} Diff
                </span>
              </div>

              {/* Base */}
              <div className="text-sm font-medium text-neutral-400 py-3 border-t border-neutral-700/50">Base Salary</div>
              <div className="text-sm text-neutral-300 py-3 border-t border-neutral-700/50">${(comparison.salary1.base_salary ?? 0).toLocaleString()}</div>
              <div className="text-sm text-neutral-300 py-3 border-t border-neutral-700/50">
                ${(comparison.salary2.base_salary ?? 0).toLocaleString()}
                <span className="block text-xs mt-1 text-neutral-500">
                  {comparison.base_difference > 0 ? '+' : '-'}${Math.abs(comparison.base_difference).toLocaleString()} Diff
                </span>
              </div>

              {/* Stock */}
              <div className="text-sm font-medium text-neutral-400 py-3 border-t border-neutral-700/50">Stock / Equity</div>
              <div className="text-sm text-neutral-300 py-3 border-t border-neutral-700/50">${(comparison.salary1.stock ?? 0).toLocaleString()}</div>
              <div className="text-sm text-neutral-300 py-3 border-t border-neutral-700/50">
                ${(comparison.salary2.stock ?? 0).toLocaleString()}
                <span className="block text-xs mt-1 text-neutral-500">
                  {comparison.stock_difference > 0 ? '+' : '-'}${Math.abs(comparison.stock_difference).toLocaleString()} Diff
                </span>
              </div>

              {/* Bonus */}
              <div className="text-sm font-medium text-neutral-400 py-3 border-t border-neutral-700/50">Bonus</div>
              <div className="text-sm text-neutral-300 py-3 border-t border-neutral-700/50">${(comparison.salary1.bonus ?? 0).toLocaleString()}</div>
              <div className="text-sm text-neutral-300 py-3 border-t border-neutral-700/50">
                ${(comparison.salary2.bonus ?? 0).toLocaleString()}
                <span className="block text-xs mt-1 text-neutral-500">
                  {comparison.bonus_difference > 0 ? '+' : '-'}${Math.abs(comparison.bonus_difference).toLocaleString()} Diff
                </span>
              </div>

            </div>
          </section>
        )}

      </div>
    </div>
  );
}
