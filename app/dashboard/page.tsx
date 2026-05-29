"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingCart, Users, Bell, 
  LogOut, TrendingUp, Rocket, Mail, Phone, Calendar, RefreshCw, Search
} from 'lucide-react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis
} from 'recharts';
import { supabase } from '../../lib/supabase';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const primaryGreen = "#008651";

  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, woo_order_id, total_amount, status, created_at, customers(first_name, last_name, company_name, email, phone)')
        .gte('created_at', `${startDate}T00:00:00.000Z`)
        .lte('created_at', `${endDate}T23:59:59.999Z`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // CRITICAL FIX: Sadece bugünden itibaren 14 gün içinde dolacak veya zamanı geçmiş alarmları çek
      const ikiHaftaSonrasi = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: tasksData, error: tasksError } = await supabase
        .from('replenishment_tasks')
        .select(`
          id, trigger_date, status,
          customers (first_name, last_name, company_name, phone, email),
          products (name)
        `)
        .eq('status', 'pending')
        .lte('trigger_date', ikiHaftaSonrasi)
        .order('trigger_date', { ascending: true });

      if (tasksError) throw tasksError;
      setAlarms(tasksData || []);

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
      })).slice(-10);

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
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#f8fafb] font-sans text-slate-800">
      
      {/* --- SIDEBAR & MOBILE NAVIGATION --- */}
      <aside className="w-full lg:w-72 bg-[#001a10] text-slate-300 flex flex-col h-auto lg:h-screen shadow-2xl z-20 shrink-0">
        {/* LOGO ALANI - FIX: Kesilmeyi önleyen rahat dolgu alanı */}
        <div className="p-6 lg:p-8 flex items-center justify-between lg:justify-center border-b border-[#008651]/20 w-full bg-[#00150d]">
          <div className="block h-12 w-44 relative">
            <img 
              src="/images/logo/logo.png" 
              alt="Toner Masters Logo" 
              className="h-full w-full object-contain brightness-110"
            />
          </div>
          <div className="h-1 w-8 bg-[#008651] rounded-full hidden lg:block mt-2"></div>
        </div>
        
        {/* NAVIGASYON - FIX: Mobilde yana kayan menü, masaüstünde dikey liste */}
        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible px-4 lg:px-6 py-4 lg:py-8 gap-2 lg:space-y-2 whitespace-nowrap scrollbar-none">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#008651] text-white rounded-xl shadow-lg shadow-[#008651]/20 text-xs lg:text-sm font-bold">
            <LayoutDashboard className="w-4 h-4 lg:w-5 lg:h-5" /> <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-[#008651]/10 hover:text-white rounded-xl text-xs lg:text-sm font-medium transition-all">
            <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-slate-500" /> <span>Order Flow</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-[#008651]/10 hover:text-white rounded-xl text-xs lg:text-sm font-medium transition-all">
            <Users className="w-4 h-4 lg:w-5 lg:h-5 text-slate-500" /> <span>Customers</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-[#008651]/10 hover:text-white rounded-xl text-xs lg:text-sm font-medium transition-all">
            <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-slate-500" /> <span>Alarms</span>
          </a>
        </nav>

        {/* PROFIL & LOGOUT */}
        <div className="p-4 lg:p-6 border-t border-[#008651]/20 bg-[#00150d] hidden lg:block mt-auto">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-9 h-9 bg-[#008651] rounded-full flex items-center justify-center text-white font-bold text-sm">A</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">Aydın Abi</p>
              <button 
                onClick={handleLogout}
                className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 hover:text-red-400 font-bold tracking-wider uppercase"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- ANA İÇERİK ALANI --- */}
      <main className="flex-1 overflow-y-auto lg:h-screen">
        
        {/* ÜST BAR */}
        <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
            <p className="text-slate-400 text-xs lg:text-sm font-medium">Monitoring AU Toner Sales & Replenishment</p>
          </div>

          {/* Tarih Seçici */}
          <div className="flex flex-wrap items-center gap-2 bg-[#f8fafb] p-2 rounded-2xl border border-slate-100 w-full sm:w-auto justify-between sm:justify-start">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white text-[11px] font-bold text-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none w-[45%] sm:w-auto"
            />
            <span className="text-slate-300 font-bold text-xs">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white text-[11px] font-bold text-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none w-[45%] sm:w-auto"
            />
            <button 
              onClick={fetchData}
              className="p-2 bg-[#008651] text-white rounded-xl hover:bg-[#006b41] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* DETAY METRİKLER VE GRAFİKLER */}
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* STATS KARTLARI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Revenue</p>
              <h3 className="text-2xl font-black text-slate-900">${totalCiro.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">In Progress</p>
              <h3 className="text-2xl font-black text-blue-600">{statusCounts['processing'] || 0} Orders</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Completed</p>
              <h3 className="text-2xl font-black text-[#008651]">{statusCounts['completed'] || 0} Success</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Alarms</p>
              <h3 className="text-2xl font-black text-red-500">{alarms.length} Due Soon</h3>
            </div>
          </div>

          {/* ANALİTİK VE ALARMLAR GRİDİ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-base lg:text-lg font-black text-slate-900 tracking-tight mb-6">Revenue Analytics</h3>
              <div className="h-[280px] lg:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryGreen} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={primaryGreen} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="ciro" stroke={primaryGreen} strokeWidth={3} fillOpacity={1} fill="url(#colorCiro)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TONER ALARMLARI LISTESI */}
            <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
              <h3 className="text-base lg:text-lg font-black text-slate-900 tracking-tight mb-6">Critical Toner Alarms (14 Days)</h3>
              <div className="space-y-4 overflow-y-auto flex-1 pr-1 max-h-[350px]">
                {alarms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <p className="text-xs font-bold">No critical alarms due within 14 days.</p>
                  </div>
                ) : (
                  alarms.map((alarm: any) => {
                    const cObj = Array.isArray(alarm.customers) ? alarm.customers[0] : alarm.customers;
                    return (
                      <div key={alarm.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                        <h4 className="font-black text-sm text-slate-800">
                          {cObj?.company_name || `${cObj?.first_name || ''} ${cObj?.last_name || 'Guest'}`}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{alarm.products?.name}</p>
                        <p className="text-[11px] font-bold text-red-500 mt-2">Due Date: {new Date(alarm.trigger_date).toLocaleDateString('en-AU')}</p>
                        <div className="flex gap-2 mt-3">
                          <a href={`mailto:${cObj?.email}`} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-lg text-[10px] font-black text-center">Email</a>
                          <a href={`tel:${cObj?.phone}`} className="flex-1 bg-[#008651] text-white py-2 rounded-lg text-[10px] font-black text-center">Call</a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* SİPARİŞ TABLOSU */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base lg:text-lg font-black text-slate-900 tracking-tight">Recent Order Flow</h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="px-6 lg:px-10 py-4 font-black">Ref ID</th>
                    <th className="px-6 lg:px-10 py-4 font-black">Entity Name</th>
                    <th className="px-6 lg:px-10 py-4 font-black">Sync Date</th>
                    <th className="px-6 lg:px-10 py-4 font-black">Status</th>
                    <th className="px-6 lg:px-10 py-4 font-black text-right">Gross Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs lg:text-sm">
                  {orders.map((order: any) => {
                    const cObj = Array.isArray(order.customers) ? order.customers[0] : order.customers;
                    return (
                      <tr key={order.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 lg:px-10 py-5 font-bold text-slate-400">#{order.woo_order_id}</td>
                        <td className="px-6 lg:px-10 py-5">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800">{cObj?.company_name || `${cObj?.first_name || ''} ${cObj?.last_name || ''}`}</span>
                            <span className="text-[10px] text-slate-400">{cObj?.email || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 lg:px-10 py-5 text-slate-500 font-bold">
                          {new Date(order.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 lg:px-10 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                            order.status === 'completed' ? 'bg-[#008651]/10 text-[#008651]' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 lg:px-10 py-5 font-black text-slate-900 text-right">${Number(order.total_amount).toFixed(2)}</td>
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