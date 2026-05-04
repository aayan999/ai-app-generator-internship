'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Salary {
  id: string;
  company: string;
  role: string;
  level: string;
  location: string;
  experience_years: number;
  base_salary: number;
  bonus: number;
  stock: number;
  total_compensation: number;
}

export default function SalaryPage() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ company: '', role: '', level: '', location: '' });

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.company) queryParams.append('company', filters.company);
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.level) queryParams.append('level', filters.level);
      if (filters.location) queryParams.append('location', filters.location);

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/v1/salaries?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSalaries(json.data);
      } else {
        console.error('Error fetching salaries', json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSalaries();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-end border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Compensation Intelligence</h1>
            <p className="text-neutral-400 mt-2">Structured data → Comparable → Decision-ready</p>
          </div>
          <Link href="/compare" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition-colors">
            Compare Offers
          </Link>
        </header>

        {/* Filters */}
        <section className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-sm flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Company</label>
            <input type="text" name="company" placeholder="e.g. Google" value={filters.company} onChange={handleFilterChange} className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Role</label>
            <input type="text" name="role" placeholder="e.g. Software Engineer" value={filters.role} onChange={handleFilterChange} className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Level</label>
            <input type="text" name="level" placeholder="e.g. L4, SDE2" value={filters.level} onChange={handleFilterChange} className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Location</label>
            <input type="text" name="location" placeholder="e.g. Bangalore" value={filters.location} onChange={handleFilterChange} className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
        </section>

        {/* Table */}
        <section className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-900 border-b border-neutral-700">
                  <th className="p-4 font-semibold text-sm text-neutral-300">Company</th>
                  <th className="p-4 font-semibold text-sm text-neutral-300">Role & Level</th>
                  <th className="p-4 font-semibold text-sm text-neutral-300">Location</th>
                  <th className="p-4 font-semibold text-sm text-neutral-300">Experience</th>
                  <th className="p-4 font-semibold text-sm text-right text-neutral-300">Total Comp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700/50">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-neutral-500">Loading data...</td></tr>
                ) : salaries.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No salaries found. Adjust your filters.</td></tr>
                ) : (
                  salaries.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-700/30 transition-colors">
                      <td className="p-4">
                        <Link href={`/company/${s.company}`} className="font-bold text-emerald-400 hover:text-emerald-300 capitalize">
                          {s.company}
                        </Link>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-white">{s.role}</div>
                        <div className="text-xs text-neutral-400 mt-1 px-2 py-0.5 bg-neutral-700 inline-block rounded">{s.level}</div>
                      </td>
                      <td className="p-4 text-neutral-300 text-sm">{s.location}</td>
                      <td className="p-4 text-neutral-300 text-sm">{s.experience_years} yrs</td>
                      <td className="p-4 text-right">
                        <div className="font-bold text-white text-lg">${s.total_compensation.toLocaleString()}</div>
                        <div className="text-xs text-neutral-500">
                          Base: ${s.base_salary.toLocaleString()} | Stock: ${s.stock.toLocaleString()} | Bonus: ${s.bonus.toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
