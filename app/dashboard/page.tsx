"use client";

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, FileText, ShoppingCart, Users, Bell, 
  Settings, LogOut, TrendingUp, TrendingDown, Rocket, 
  AlertTriangle, Mail, Phone, Calendar, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { supabase } from '../../lib/supabase';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // Tarih Filtre Stateleri (Varsayılan: Son 30 Gün)
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Canlı Veri Stateleri
  const [orders, setOrders] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [totalCiro, setTotalCiro] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<{ [key: string]: number }>({});

  const dailyAdsSpend = 120.50; // Sabit Ads bütçesi simülasyonu

  // Verileri getiren ana fonksiyon (Tarih değiştikçe tetiklenir)
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Tarih Aralığına Göre Siparişleri ve Müşterileri Çek
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, woo_order_id, total_amount, status, created_at, customers(first_name, last_name, company_name, email, phone)')
        .gte('created_at', `${startDate}T00:00:00.000Z`)
        .lte('created_at', `${endDate}T23:59:59.999Z`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // 2. Bekleyen Toner Alarmlarını Çek
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

      // 3. Metrikleri ve Grafik Verisini Hesapla
      let ciroHesap = 0;
      const statusMap: { [key: string]: number } = {};
      const dateMap: { [key: string]: number } = {};

      ordersData?.forEach((order: any) => {
        // Ciro Toplamı
        ciroHesap += Number(order.total_amount || 0);

        // Sipariş Durumu Sayıları
        const status = order.status || 'unknown';
        statusMap[status] = (statusMap[status] || 0) + 1;

        // Grafik için gün bazlı gruplama
        const dayLabel = new Date(order.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        dateMap[dayLabel] = (dateMap[dayLabel] || 0) + Number(order.total_amount || 0);
      });

      setTotalCiro(ciroHesap);
      setStatusCounts(statusMap);

      // Grafik verisini Recharts formatına dönüştür
      const formattedChart = Object.entries(dateMap).map(([name, ciro]) => ({
        name,
        ciro,
        ads: dailyAdsSpend
      })).reverse(); // Kronolojik sıra için

      setChartData(formattedChart.length > 0 ? formattedChart : [{ name: 'Veri Yok', ciro: 0, ads: 0 }]);

    } catch (err) {
      console.error("Filtreleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tarih filtreleri her değiştiğinde veritabanını yeniden sorgula
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      
      {/* SOL MENÜ (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">TONER<br/>MASTERS</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5" /> <span className="font-bold">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
            <ShoppingCart className="w-5 h-5" /> <span>Orders</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
            <Users className="w-5 h-5" /> <span>Customers</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
            <Bell className="w-5 h-5" /> <span>Toner Alarms</span>
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">TM</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Aydın Abi</p>
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-1 cursor-pointer hover:text-red-400">
                <LogOut className="w-3 h-3" /> Logout
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ANA İÇERİK ALANI */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* ÜST BAR: BAŞLIK VE TARİH SEÇİCİ */}
        <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-slate-500 font-bold mb-1">Toner Masters Yönetim Paneli</h2>
            <h1 className="text-3xl font-bold text-slate-900">Canlı Kokpit Ekranı</h1>
          </div>

          {/* DİNAMİK TARİH FİLTRESİ ELEMANI */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Filtrele:</span>
            </div>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none text-slate-700 focus:border-blue-500"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none text-slate-700 focus:border-blue-500"
            />
            <button 
              onClick={fetchData} 
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="h-[60vh] w-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-bold">Veritabanı filtreleniyor...</p>
            </div>
          </div>
        ) : (
          <>
            {/* 1. SEKTÖR: FİNANSAL VE DURUM KARTLARI (CİRO VE SİPARİŞ DURUMU) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-green-100 p-4 rounded-full text-green-600"><TrendingUp className="w-7 h-7" /></div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seçili Dönem Cirosu</h3>
                  <p className="text-2xl font-bold text-slate-800">${totalCiro.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-blue-100 p-4 rounded-full text-blue-600"><ShoppingCart className="w-7 h-7" /></div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">İşleniyor (Processing)</h3>
                  <p className="text-2xl font-bold text-blue-600">{statusCounts['processing'] || 0} Sipariş</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-emerald-100 p-4 rounded-full text-emerald-600"><Rocket className="w-7 h-7" /></div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tamamlanan (Completed)</h3>
                  <p className="text-2xl font-bold text-emerald-600">{statusCounts['completed'] || 0} Sipariş</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-amber-100 p-4 rounded-full text-amber-600"><FileText className="w-7 h-7" /></div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Beklemede (On Hold)</h3>
                  <p className="text-2xl font-bold text-amber-600">{statusCounts['on-hold'] || 0} Sipariş</p>
                </div>
              </div>
            </div>

            {/* 2. SEKTÖR: GRAFİK VE TONER ALARMLARI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* Dinamik Ciro Grafiği */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Dönemsel Performans Trendi</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="ciro" name="Kazanılan Ciro" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TONER ALARMLARI MODÜLÜ */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Toner Döngüsü Alarmları</h3>
                  <AlertTriangle className={`w-5 h-5 ${alarms.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`} />
                </div>
                
                <div className="space-y-4 overflow-y-auto flex-1 pr-2 max-h-[300px]">
                  {alarms.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium text-center py-8">Kritik döngüde olan toner alarmı bulunamadı.</p>
                  ) : (
                    alarms.map((alarm: any) => {
                      const cObj = Array.isArray(alarm.customers) ? alarm.customers[0] : alarm.customers;
                      return (
                        <div key={alarm.id} className="bg-red-50/50 border border-red-100 p-4 rounded-xl">
                          <h4 className="font-bold text-slate-800">
                            {cObj?.company_name || `${cObj?.first_name || ''} ${cObj?.last_name || 'Bilinmeyen Müşteri'}`}
                          </h4>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">{alarm.products?.name}</p>
                          <p className="text-xs font-bold text-red-500 mt-2">Öngörülen Bitiş: {new Date(alarm.trigger_date).toLocaleDateString('tr-TR')}</p>
                          
                          <div className="flex gap-2 mt-3">
                            <a href={`mailto:${cObj?.email}`} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                              <Mail className="w-3.5 h-3.5" /> Mail At
                            </a>
                            <a href={`tel:${cObj?.phone}`} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                              <Phone className="w-3.5 h-3.5" /> Ara
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 3. SEKTÖR: MÜŞTERİ VE SİPARİŞ DURUMU DETAY TABLOSU */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Seçili Tarihteki Tüm Sipariş ve Müşteri Akışı</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-sm text-slate-400">
                      <th className="pb-3 font-bold">Woo ID</th>
                      <th className="pb-3 font-bold">Müşteri / Firma</th>
                      <th className="pb-3 font-bold">Tarih</th>
                      <th className="pb-3 font-bold">Durum</th>
                      <th className="pb-3 font-bold text-right">Ciro (Tutar)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">Bu tarih aralığında hiçbir sipariş kaydı bulunamadı.</td>
                      </tr>
                    ) : (
                      orders.map((order: any) => {
                        const cObj = Array.isArray(order.customers) ? order.customers[0] : order.customers;
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 font-semibold text-slate-500">#{order.woo_order_id}</td>
                            <td className="py-4">
                              <p className="font-bold text-slate-800">{cObj?.company_name || `${cObj?.first_name || ''} ${cObj?.last_name || ''}`}</p>
                              <p className="text-xs text-slate-400">{cObj?.email || 'E-posta Yok'}</p>
                            </td>
                            <td className="py-4 text-slate-600 font-medium">
                              {new Date(order.created_at).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 font-bold text-slate-800 text-right">
                              ${Number(order.total_amount).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}