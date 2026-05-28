"use client";

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, FileText, ShoppingCart, Users, Bell, 
  Settings, LogOut, TrendingUp, TrendingDown, Rocket, 
  AlertTriangle, Mail, Phone 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { supabase } from '../../lib/supabase';

interface AlarmTask {
  id: string;
  trigger_date: string;
  status: string;
  customers: { first_name: string; last_name: string; company_name: string } | null;
  products: { name: string } | null;
}

interface ChartItem {
  name: string;
  ciro: number;
  ads: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dailyCiro, setDailyCiro] = useState(0);
  const [alarms, setAlarms] = useState<AlarmTask[]>([]);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; adet: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; ciro: number; adet: number }[]>([]);

  const dailyAdsSpend = 120.50; 

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount, created_at, customer_id, customers(first_name, last_name, company_name)')
          .gte('created_at', sevenDaysAgo.toISOString());

        if (ordersError) throw ordersError;

        const { data: tasks, error: tasksError } = await supabase
          .from('replenishment_tasks')
          .select(`
            id, trigger_date, status,
            customers (first_name, last_name, company_name),
            products (name)
          `)
          .eq('status', 'pending')
          .order('trigger_date', { ascending: true })
          .limit(5);

        if (tasksError) throw tasksError;
        setAlarms(tasks as unknown as AlarmTask[]);

        let todayTotal = 0;
        const todayStr = new Date().toISOString().split('T')[0];
        
        const daysOfWeek = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const processedChartData = daysOfWeek.map(day => ({ name: day, ciro: 0, ads: dailyAdsSpend }));

        const customerMap: { [key: string]: { name: string; ciro: number; adet: number } } = {};

        // VERCEL HATASINI ÇÖZEN KISIM: (order: any) diyerek tip zorlamasını aşıyoruz
        orders?.forEach((order: any) => {
          const orderDate = order.created_at.split('T')[0];
          if (orderDate === todayStr) {
            todayTotal += Number(order.total_amount);
          }

          const dayIndex = new Date(order.created_at).getDay(); 
          const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; 
          processedChartData[adjustedIndex].ciro += Number(order.total_amount);

          if (order.customers) {
            // Supabase Join verisi dizi veya obje gelebilir, güvenli okuma yapıyoruz
            const cObj = Array.isArray(order.customers) ? order.customers[0] : order.customers;
            const cName = cObj?.company_name || `${cObj?.first_name || ''} ${cObj?.last_name || ''}`;
            
            if (!customerMap[cName]) {
              customerMap[cName] = { name: cName, ciro: 0, adet: 0 };
            }
            customerMap[cName].ciro += Number(order.total_amount);
            customerMap[cName].adet += 1;
          }
        });

        setDailyCiro(todayTotal);
        setChartData(processedChartData);
        
        const sortedCustomers = Object.values(customerMap)
          .sort((a, b) => b.ciro - a.ciro)
          .slice(0, 3);
        setTopCustomers(sortedCustomers);

        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('quantity, products(name)')
          .limit(20); 

        if (!itemsError && orderItems) {
          const productMap: { [key: string]: number } = {};
          // VERCEL HATASINI ÇÖZEN KISIM: (item: any) diyerek tip zorlamasını aşıyoruz
          orderItems.forEach((item: any) => {
            if (item.products) {
              const pObj = Array.isArray(item.products) ? item.products[0] : item.products;
              const pName = pObj?.name || 'Bilinmeyen Ürün';
              productMap[pName] = (productMap[pName] || 0) + item.quantity;
            }
          });
          const sortedProducts = Object.entries(productMap)
            .map(([name, adet]) => ({ name, adet }))
            .sort((a, b) => b.adet - a.adet)
            .slice(0, 3);
          setTopProducts(sortedProducts);
        }

      } catch (err) {
        console.error("Veri yüklenirken hata oluştu:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const roas = dailyAdsSpend > 0 ? (dailyCiro / dailyAdsSpend).toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold">Canlı veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      
      {/* SOL MENÜ */}
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
            <FileText className="w-5 h-5" /> <span>B2B Proposals</span>
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
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">A</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Aydın Abi</p>
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-1 cursor-pointer hover:text-red-400">
                <LogOut className="w-3 h-3" /> Logout
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8">
          <h2 className="text-slate-500 font-bold mb-1">Toner Masters CRM</h2>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            Hoş Geldin, Aydın Abi 👋
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-full text-green-600">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-500">Bugünkü Net Ciro</h3>
              <p className="text-3xl font-bold text-slate-800">${dailyCiro.toFixed(2)}</p>
              <p className="text-xs font-bold text-green-500 mt-1">Canlı WooCommerce Akışı</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-red-100 p-4 rounded-full text-red-500">
              <TrendingDown className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-500">Google Ads Harcaması</h3>
              <p className="text-3xl font-bold text-slate-800">${dailyAdsSpend.toFixed(2)}</p>
              <p className="text-xs font-bold text-slate-400 mt-1">Günlük Ortalama Sabit</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-full text-blue-600">
              <Rocket className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-500">Anlık ROAS</h3>
              <p className="text-3xl font-bold text-slate-800">{roas}x</p>
              <p className="text-xs font-bold text-blue-500 mt-1">Yatırım / Kazanç Oranı</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Haftalık Performans Trendi</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="ciro" name="Ciro" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a' }} />
                  <Line type="monotone" dataKey="ads" name="Ads Spend" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Toner Döngüsü Alarmları ({alarms.length})</h3>
              <AlertTriangle className={`w-5 h-5 ${alarms.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`} />
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {alarms.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium text-center py-8">Bekleyen veya süresi dolan toner alarmı bulunamadı.</p>
              ) : (
                alarms.map(alarm => (
                  <div key={alarm.id} className="bg-red-50/50 border border-red-100 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800">
                          {alarm.customers?.company_name || `${alarm.customers?.first_name} ${alarm.customers?.last_name}`}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">{alarm.products?.name}</p>
                        <p className="text-xs font-bold text-red-500 mt-1">Hedef Tarih: {new Date(alarm.trigger_date).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <Mail className="w-4 h-4" /> Mail At
                      </button>
                      <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <Phone className="w-4 h-4" /> Ara
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              🔥 Çok Satan İlk Ürünler
            </h3>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">Henüz sipariş kalemi verisi yok.</p>
              ) : (
                topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                    <span className="font-bold text-slate-700">{p.name}</span>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">{p.adet} Adet</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              🏆 En Değerli Müşteriler
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-sm text-slate-400">
                    <th className="pb-3 font-bold">Firma / İsim</th>
                    <th className="pb-3 font-bold">Ciro</th>
                    <th className="pb-3 font-bold">Sipariş</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {topCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-sm text-slate-400 text-center">Henüz sipariş veren müşteri verisi yok.</td>
                    </tr>
                  ) : (
                    topCustomers.map((c, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-bold text-slate-700">{c.name}</td>
                        <td className="py-3 font-bold text-green-600">${c.ciro.toFixed(2)}</td>
                        <td className="py-3 text-slate-500">{c.adet} Sipariş</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}