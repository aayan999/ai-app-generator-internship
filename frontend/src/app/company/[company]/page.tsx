'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CompanyPage() {
  const params = useParams();
  const companyName = params.company as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyName) return;

    const fetchCompanyData = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(companyName)}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          console.error(json.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyName]);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex items-center space-x-4 border-b border-neutral-800 pb-4">
          <Link href="/" className="text-neutral-500 hover:text-white transition-colors">
            ← Back
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight text-white capitalize">{companyName}</h1>
        </header>

        {loading ? (
          <div className="text-neutral-500 text-center p-12">Loading data...</div>
        ) : !data ? (
          <div className="text-neutral-500 text-center p-12">No data found for this company.</div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-sm flex flex-col items-center justify-center">
                <div className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Median Total Comp</div>
                <div className="text-4xl font-bold text-emerald-400">${data.median_total_compensation.toLocaleString()}</div>
              </div>
              
              <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-sm">
                <div className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Level Distribution</div>
                <div className="space-y-3">
                  {Object.entries(data.level_distribution).map(([lvl, count]: any) => (
                    <div key={lvl} className="flex justify-between items-center">
                      <div className="bg-neutral-700 px-2 py-1 rounded text-sm text-white font-medium">{lvl}</div>
                      <div className="text-neutral-400 text-sm">{count} entries</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Salary List */}
            <h2 className="text-2xl font-bold mt-8 mb-4 border-b border-neutral-800 pb-2">Recent Submissions</h2>
            <div className="space-y-4">
              {data.salaries.map((s: any) => (
                <div key={s.id} className="bg-neutral-800 p-5 rounded-xl border border-neutral-700 flex justify-between items-center shadow-sm hover:border-neutral-600 transition-colors">
                  <div>
                    <div className="font-medium text-lg text-white">{s.role}</div>
                    <div className="text-sm text-neutral-400 mt-1">{s.location} • {s.experience_years} yrs exp</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs bg-neutral-700 inline-block px-2 py-0.5 rounded text-white font-medium mb-1">{s.level}</div>
                    <div className="font-bold text-emerald-400 text-xl">${s.total_compensation.toLocaleString()}</div>
                    <div className="text-xs text-neutral-500">Base: ${s.base_salary.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
