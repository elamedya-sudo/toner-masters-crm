"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingCart, Users, Bell, 
  LogOut, TrendingUp, Rocket, AlertTriangle, 
  Mail, Phone, Calendar, RefreshCw, ChevronRight, Search
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { supabase } from '../../lib/supabase';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Renk Paleti (İstediğin ana renk)
  const primaryGreen = "#008651";

  // Tarih Filtreleri (Varsayılan: Son 30 Gün)
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Veri Stateleri
  const [orders, setOrders] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [totalCiro, setTotalCiro] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<{ [key: string]: number }>({});

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Siparişleri ve Müşterileri Çek
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, woo_order_id, total_amount, status, created_at, customers(first_name, last_name, company_name, email, phone)')
        .gte('created_at', `${startDate}T00:00:00.000Z`)
        .lte('created_at', `${endDate}T23:59:59.999Z`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // 2. Bekleyen Toner Alarmları
      const { data: tasksData, error: tasksError } = await supabase
        .from('replenishment_tasks')
        .select(`
          id, trigger_date, status,
          customers (first_name, last_name, company_name, phone, email),
          products (name)
        `)
        .eq('status', 'pending')
        .order('trigger_date', { ascending: true });

      if (tasksError) throw tasksError;
      setAlarms(tasksData || []);

      // 3. Hesaplamalar
      let ciroTotal = 0;
      const statusMap: { [key: string]: number } = {};
      const dateMap: { [key: string]: number } = {};

      ordersData?.forEach((order: any) => {
        ciroTotal += Number(order.total_amount || 0);
        statusMap[order.status] = (statusMap[order.status] || 0) + 1;

        const dayLabel = new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
        dateMap[dayLabel] = (dateMap[dayLabel] || 0) + Number(order.total_amount || 0);
      });

      setTotalCiro(ciroTotal);
      setStatusCounts(statusMap);

      const formattedChart = Object.entries(dateMap).map(([name, ciro]) => ({
        name,
        ciro
      })).slice(-10); // Son 10 günün verisi

      setChartData(formattedChart.length > 0 ? formattedChart : [{ name: 'No Data', ciro: 0 }]);

    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  return (
    <div className="flex h-screen w-full bg-[#f8fafb] font-sans overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-72 bg-[#001a10] text-slate-300 flex flex-col h-full shadow-2xl z-20">
        {/* Logo Alanı */}
        <div className="p-8 flex flex-col items-center justify-center border-b border-[#008651]/20">
          <img 
            src="/images/logo/logo.png" 
            alt="Toner Masters Logo" 
            className="w-full max-w-[180px] h-auto object-contain brightness-110 mb-2"
          />
          <div className="h-1 w-12 bg-[#008651] rounded-full"></div>
        </div>
        
        {/* Navigasyon */}
        <nav className="flex-1 px-6 py-8 space-y-4">
          <p className="text-[10px] uppercase tracking-[2px] font-bold text-slate-500 px-4 mb-4">Main Menu</p>
          <a href="#" className="flex items-center gap-3 px-4 py-3.5 bg-[#008651] text-white rounded-xl shadow-lg shadow-[#008651]/20 transition-all">
            <LayoutDashboard className="w-5 h-5" /> <span className="font-bold">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#008651]/10 hover:text-white rounded-xl transition-all group">
            <ShoppingCart className="w-5 h-5 text-slate-500 group-hover:text-[#008651]" /> <span>Order Flow</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#008651]/10 hover:text-white rounded-xl transition-all group">
            <Users className="w-5 h-5 text-slate-500 group-hover:text-[#008651]" /> <span>Customers</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#008651]/10 hover:text-white rounded-xl transition-all group">
            <Bell className="w-5 h-5 text-slate-500 group-hover:text-[#008651]" /> <span>Toner Alarms</span>
          </a>
        </nav>

        {/* Profil & Logout */}
        <div className="p-6 border-t border-[#008651]/20 bg-[#00150d]">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-10 h-10 bg-[#008651] rounded-full flex items-center justify-center text-white font-bold ring-2 ring-[#008651]/20">A</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">Aydın Abi</p>
              <button 
                onClick={handleLogout}
                className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 hover:text-red-400 transition-colors uppercase font-bold tracking-wider"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- ANA İÇERİK --- */}
      <main className="flex-1 overflow-y-auto">
        
        {/* ÜST BAR */}
        <header className="bg-white border-b border-slate-200 px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
            <p className="text-slate-400 text-sm font-medium">Monitoring AU Toner Sales & Replenishment</p>
          </div>

          {/* Tarih Filtreleme */}
          <div className="flex items-center gap-2 bg-[#f8fafb] p-2 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 px-3 text-slate-500">
              <Calendar className="w-4 h-4 text-[#008651]" />
              <span className="text-xs font-bold uppercase">Period:</span>
            </div>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white text-xs font-bold text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 ring-[#008651]/20 outline-none"
            />
            <span className="text-slate-300 font-bold">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white text-xs font-bold text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 ring-[#008651]/20 outline-none"
            />
            <button 
              onClick={fetchData}
              className="p-2.5 bg-[#008651] text-white rounded-xl hover:bg-[#006b41] transition-all shadow-md shadow-[#008651]/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto">
          
          {/* STATS KARTLARI */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-16 h-16 text-[#008651]" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Net Revenue</p>
              <h3 className="text-3xl font-black text-slate-900">${totalCiro.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</h3>
              <div className="mt-4 flex items-center gap-2 text-[#008651] font-bold text-xs bg-[#008651]/5 py-1.5 px-3 rounded-full w-fit">
                <Rocket className="w-3 h-3" /> Live from WooCommerce
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">In Progress</p>
              <h3 className="text-3xl font-black text-blue-600">{statusCounts['processing'] || 0} Orders</h3>
              <div className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-xs bg-blue-50 py-1.5 px-3 rounded-full w-fit">
                Processing Phase
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Completed</p>
              <h3 className="text-3xl font-black text-[#008651]">{statusCounts['completed'] || 0} Success</h3>
              <div className="mt-4 flex items-center gap-2 text-[#008651] font-bold text-xs bg-[#008651]/5 py-1.5 px-3 rounded-full w-fit">
                Fully Synchronized
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active Alarms</p>
              <h3 className="text-3xl font-black text-red-500">{alarms.length} Critical</h3>
              <div className="mt-4 flex items-center gap-2 text-red-500 font-bold text-xs bg-red-50 py-1.5 px-3 rounded-full w-fit">
                Replenishment Required
              </div>
            </div>
          </div>

          {/* ORTA BÖLÜM: GRAFİK & ALARMLAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            
            {/* Grafik */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Revenue Analytics</h3>
                <span className="text-xs font-bold text-[#008651] bg-[#008651]/5 px-4 py-2 rounded-xl">Periodic Trend</span>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryGreen} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={primaryGreen} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} 
                    />
                    <Area type="monotone" dataKey="ciro" stroke={primaryGreen} strokeWidth={4} fillOpacity={1} fill="url(#colorCiro)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ALARMLAR LİSTESİ */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Toner Alarms</h3>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              </div>
              
              <div className="space-y-4 overflow-y-auto flex-1 pr-2 max-h-[350px] scrollbar-hide">
                {alarms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Bell className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm font-bold">All clear today!</p>
                  </div>
                ) : (
                  alarms.map((alarm: any) => {
                    const cObj = Array.isArray(alarm.customers) ? alarm.customers[0] : alarm.customers;
                    return (
                      <div key={alarm.id} className="bg-slate-50 hover:bg-[#008651]/5 border border-slate-100 p-5 rounded-2xl transition-all group">
                        <h4 className="font-black text-slate-800 group-hover:text-[#008651] transition-colors">
                          {cObj?.company_name || `${cObj?.first_name || ''} ${cObj?.last_name || 'Guest'}`}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-bold uppercase mt-1">{alarm.products?.name}</p>
                        <div className="flex items-center gap-2 mt-4">
                          <a href={`mailto:${cObj?.email}`} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-white hover:shadow-md transition-all">
                            <Mail className="w-3 h-3" /> Email
                          </a>
                          <a href={`tel:${cObj?.phone}`} className="flex-1 bg-[#008651] text-white py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[#006b41] transition-all">
                            <Phone className="w-3 h-3" /> Call
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ALT BÖLÜM: SİPARİŞ TABLOSU */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Order Flow</h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search customer or order..." 
                  className="bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-6 py-2.5 text-sm font-medium focus:ring-2 ring-[#008651]/20 outline-none w-full md:w-80"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] text-slate-400 uppercase tracking-widest">
                    <th className="px-10 py-5 font-black">Ref ID</th>
                    <th className="px-10 py-5 font-black">Entity Name</th>
                    <th className="px-10 py-5 font-black">Sync Date</th>
                    <th className="px-10 py-5 font-black">Fulfillment</th>
                    <th className="px-10 py-5 font-black text-right">Gross Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {orders.map((order: any) => {
                    const cObj = Array.isArray(order.customers) ? order.customers[0] : order.customers;
                    return (
                      <tr key={order.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6 font-bold text-slate-400 group-hover:text-[#008651]">#{order.woo_order_id}</td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800">{cObj?.company_name || `${cObj?.first_name || ''} ${cObj?.last_name || ''}`}</span>
                            <span className="text-[11px] text-slate-400 font-medium">{cObj?.email || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-slate-500 font-bold">
                          {new Date(order.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-10 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            order.status === 'completed' ? 'bg-[#008651]/10 text-[#008651]' :
                            order.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-10 py-6 font-black text-slate-900 text-right">
                          ${Number(order.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}