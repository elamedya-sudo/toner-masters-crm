// app/login/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Geçersiz e-posta veya şifre. Lütfen tekrar deneyin.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white font-sans">
      
      {/* SOL TARAF: FORM ALANI */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative z-10">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-10">
            <img src="/images/logo/logo.png" alt="Toner Masters" className="h-14 w-auto object-contain mb-8" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 mt-2 font-medium">Log in to the Toner Masters Executive Dashboard to manage orders and B2B proposals.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-[#008651]/20 focus:border-[#008651] transition-all"
                  placeholder="admin@tonermasters.com.au"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-[#008651]/20 focus:border-[#008651] transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#008651] text-white py-4 rounded-xl font-bold shadow-lg shadow-[#008651]/30 hover:bg-[#006b41] transition-all disabled:opacity-70 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Sign In <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="mt-12 text-center lg:text-left">
            <p className="text-xs font-bold text-slate-400">© 2026 Toner Masters Pty Ltd. Commercial Portal.</p>
          </div>
        </div>
      </div>

      {/* SAĞ TARAF: KURUMSAL GÖRSEL ALAN */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#001a10] to-[#008651] flex-col items-center justify-center relative overflow-hidden">
        {/* Dekoratif Çemberler */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#000000]/20 rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 p-20 text-center">
          <div className="w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <div className="w-10 h-10 bg-white rounded-full"></div>
          </div>
          <h2 className="text-5xl font-black text-white mb-6 leading-tight">B2B Commercial<br/>Supply Engine.</h2>
          <p className="text-[#008651] text-lg font-medium bg-white/10 py-3 px-6 rounded-full inline-block backdrop-blur-sm border border-white/20">
            Powered by Data, Driven by Service.
          </p>
        </div>
      </div>
      
    </div>
  );
}