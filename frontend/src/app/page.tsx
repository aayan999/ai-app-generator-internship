'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return y;
}

/* ─── Floating Orbs Background ─── */
function OrbBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[120px] animate-float" />
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[120px] animate-float-reverse" />
      <div className="absolute bottom-[-5%] left-[20%] w-[400px] h-[400px] rounded-full bg-fuchsia-600/10 blur-[100px] animate-float-slow" />
      <div className="absolute top-[60%] left-[50%] w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[80px] animate-float" />
    </div>
  );
}

/* ─── Navbar ─── */
function LandingNav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass-strong shadow-2xl shadow-black/20' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
            <span className="text-white font-black text-lg">A</span>
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">AI App<span className="gradient-text"> Generator</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How it Works', 'Stack'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s/g, '-')}`} className="text-white/50 hover:text-white text-sm font-medium transition-colors">{item}</a>
          ))}
          <Link href="/login" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all">
            Launch App →
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full border border-white/[0.03] animate-spin-slow" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-indigo-500/10 animate-counter-spin" />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-purple-500/10 animate-spin-slow" />
        {/* Orbiting dots */}
        <div className="absolute animate-orbit"><div className="w-2 h-2 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/50" /></div>
        <div className="absolute animate-orbit-reverse"><div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50" /></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-white/60">Config-Driven • Zero Code • Infinite Possibilities</span>
        </div>

        {/* Main heading */}
        <h1 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-6 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-white">Build Apps</span>
          <br />
          <span className="gradient-text">Without Code</span>
        </h1>

        {/* Subtitle */}
        <p className={`text-lg sm:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          Write a JSON config. Get a full-stack app with <span className="text-white/70">authentication</span>, <span className="text-white/70">dynamic APIs</span>, <span className="text-white/70">beautiful UI</span>, and a <span className="text-white/70">PostgreSQL database</span> — instantly.
        </p>

        {/* CTA buttons */}
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Link href="/signup" className="group relative px-8 py-4 rounded-2xl text-white font-bold text-lg overflow-hidden shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 animate-gradient" />
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
            <span className="relative flex items-center gap-2">
              Start Building Free
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
          </Link>
          <a href="#how-it-works" className="px-8 py-4 rounded-2xl text-white/60 font-semibold text-lg glass hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            See How It Works
          </a>
        </div>

        {/* Code preview card */}
        <div className={`max-w-3xl mx-auto transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
          <div className="glass-strong rounded-3xl p-1 shadow-2xl shadow-indigo-500/10">
            <div className="bg-gray-950/80 rounded-[22px] overflow-hidden">
              {/* Window controls */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="ml-3 text-xs text-white/30 font-mono">app-config.json</span>
              </div>
              {/* Code content */}
              <div className="p-6 font-mono text-sm leading-relaxed text-left overflow-x-auto code-scroll">
                <div className="animate-code-1"><span className="text-white/30">{'{'}</span></div>
                <div className="animate-code-2 ml-4"><span className="text-indigo-400">&quot;entities&quot;</span><span className="text-white/30">: {'{'}</span></div>
                <div className="animate-code-3 ml-8"><span className="text-purple-400">&quot;customers&quot;</span><span className="text-white/30">: {'{'}</span></div>
                <div className="animate-code-4 ml-12"><span className="text-fuchsia-400">&quot;name&quot;</span><span className="text-white/30">: {'{'} </span><span className="text-emerald-400">&quot;type&quot;</span><span className="text-white/30">: </span><span className="text-amber-400">&quot;string&quot;</span><span className="text-white/30"> {'}'}</span></div>
                <div className="animate-code-3 ml-12"><span className="text-fuchsia-400">&quot;email&quot;</span><span className="text-white/30">: {'{'} </span><span className="text-emerald-400">&quot;type&quot;</span><span className="text-white/30">: </span><span className="text-amber-400">&quot;email&quot;</span><span className="text-white/30"> {'}'}</span></div>
                <div className="animate-code-2 ml-8"><span className="text-white/30">{'}'}</span></div>
                <div className="animate-code-1 ml-4"><span className="text-white/30">{'}'}</span></div>
                <div className="animate-code-1"><span className="text-white/30">{'}'}</span></div>
              </div>
              {/* Arrow and result */}
              <div className="px-6 pb-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                <span className="text-indigo-400 text-lg animate-pulse">↓ generates ↓</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              </div>
              <div className="px-6 pb-6 flex items-center justify-center gap-3 flex-wrap">
                {['PostgreSQL Table', 'REST API', 'React Form', 'Data Table', 'Auth'].map((item, i) => (
                  <span key={item} className="px-3 py-1.5 rounded-lg text-xs font-medium glass text-white/70" style={{ animationDelay: `${i * 0.1}s` }}>✓ {item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
const FEATURES = [
  { icon: '⚡', title: 'Zero to Full-Stack in Seconds', desc: 'Define your entities in JSON. Get a complete database, REST API, and beautiful UI — no boilerplate.', color: 'from-amber-500 to-orange-600' },
  { icon: '🔐', title: 'Dual Authentication', desc: 'Email/Password and Magic Link auth, fully configured from JSON. JWT tokens with auto-refresh built in.', color: 'from-emerald-500 to-teal-600' },
  { icon: '🌍', title: 'Multi-Language (i18n)', desc: 'Switch between English, Spanish, French, Hindi at runtime. All translations live in the config file.', color: 'from-blue-500 to-cyan-600' },
  { icon: '🛡️', title: 'Bulletproof Resilience', desc: 'Missing config keys? Malformed JSON? The engine gracefully falls back to defaults. It never crashes.', color: 'from-red-500 to-rose-600' },
  { icon: '📤', title: 'One-Click GitHub Export', desc: 'Push your entire generated project to GitHub with README, Dockerfile, and docker-compose — one button.', color: 'from-purple-500 to-violet-600' },
  { icon: '🎨', title: 'Dynamic UI Engine', desc: 'Forms, tables, dropdowns, toggles, date pickers — all rendered automatically from field type definitions.', color: 'from-indigo-500 to-blue-600' },
];

function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full glass text-xs font-semibold text-indigo-300 tracking-wider uppercase mb-4">Features</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Everything You Need,<br /><span className="gradient-text">Nothing You Don&apos;t</span></h2>
          <p className="text-white/40 max-w-xl mx-auto">One JSON file replaces weeks of repetitive full-stack development.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="group relative glass rounded-3xl p-8 hover:bg-white/[0.06] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
const STEPS = [
  { num: '01', title: 'Write Your Config', desc: 'Define entities, fields, auth methods, and languages in a single JSON file.', code: '"customers": {\n  "name": { "type": "string" },\n  "email": { "type": "email" }\n}' },
  { num: '02', title: 'Engine Generates Everything', desc: 'The backend reads your config and auto-creates database tables, REST APIs, and validation rules.', code: '✓ CREATE TABLE customers...\n✓ POST /api/v1/customers\n✓ GET  /api/v1/customers\n✓ Zod validation schema' },
  { num: '03', title: 'Use Your App', desc: 'The frontend dynamically renders forms, tables, and navigation. Create, edit, delete — it all just works.', code: '→ Dynamic Form rendered\n→ Dynamic Table rendered\n→ Search, Sort, Paginate\n→ User-scoped data' },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-32 z-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full glass text-xs font-semibold text-purple-300 tracking-wider uppercase mb-4">How It Works</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Three Steps.<br /><span className="gradient-text">That&apos;s It.</span></h2>
        </div>
        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <div key={step.num} className={`flex flex-col lg:flex-row items-center gap-8 ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <div className="flex-1 space-y-4">
                <span className="text-6xl font-black text-white/[0.05]">{step.num}</span>
                <h3 className="text-2xl font-bold text-white -mt-8">{step.title}</h3>
                <p className="text-white/40 leading-relaxed">{step.desc}</p>
              </div>
              <div className="flex-1 w-full">
                <div className="glass-strong rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <pre className="p-5 font-mono text-sm text-indigo-300/80 whitespace-pre-wrap">{step.code}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Tech Stack ─── */
const STACK = [
  { name: 'Next.js', desc: 'React Framework', color: '#000' },
  { name: 'TypeScript', desc: 'Type Safety', color: '#3178c6' },
  { name: 'PostgreSQL', desc: 'Database', color: '#336791' },
  { name: 'Tailwind', desc: 'Styling', color: '#38bdf8' },
  { name: 'Node.js', desc: 'Backend Runtime', color: '#68a063' },
  { name: 'Zod', desc: 'Validation', color: '#3068b7' },
];

function StackSection() {
  return (
    <section id="stack" className="relative py-32 z-10">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full glass text-xs font-semibold text-cyan-300 tracking-wider uppercase mb-4">Tech Stack</span>
        <h2 className="text-4xl md:text-5xl font-black text-white mb-12">Built With the <span className="gradient-text">Best</span></h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STACK.map((tech) => (
            <div key={tech.name} className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-sm" style={{ background: `${tech.color}30`, border: `1px solid ${tech.color}40` }}>
                {tech.name.charAt(0)}
              </div>
              <p className="font-semibold text-white text-sm">{tech.name}</p>
              <p className="text-white/30 text-xs mt-0.5">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  return (
    <section className="relative py-32 z-10">
      <div className="max-w-4xl mx-auto px-6">
        <div className="relative rounded-[32px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 animate-gradient" />
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Ready to Build?</h2>
            <p className="text-white/70 text-lg mb-8 max-w-lg mx-auto">Stop writing boilerplate. Start shipping products. Your next full-stack app is one JSON file away.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-gray-900 font-bold text-lg hover:bg-white/90 transition-all shadow-2xl shadow-black/20 hover:scale-105">
              Get Started Now
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-white/30 text-sm">© 2026 AI App Generator. Built with ❤️</p>
        <div className="flex items-center gap-6">
          <a href="https://github.com/aayan999" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  const scrollY = useScrollY();

  return (
    <div className="min-h-screen bg-gray-950 relative noise grid-pattern">
      <OrbBackground />
      <LandingNav scrolled={scrollY > 50} />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StackSection />
      <CTASection />
      <Footer />
    </div>
  );
}
