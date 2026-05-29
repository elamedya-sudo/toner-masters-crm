"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingCart, Users, Bell, FileText, 
  LogOut, Plus, Trash2, Save, Send, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function ProposalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Teklif Form Stateleri
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_name: '', quantity: 1, unit_price: 0 }]);

  // Sayfa yüklendiğinde müşterileri çek (Senin veritabanından)
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('id, company_name, first_name, last_name, email').order('company_name');
      if (data) setCustomers(data);
    };
    fetchCustomers();
  }, []);

  // Yeni ürün kalemi ekle
  const addItem = () => setItems([...items, { product_name: '', quantity: 1, unit_price: 0 }]);

  // Ürün kalemini sil
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  // Kalem değerlerini güncelle
  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Toplam Teklif Tutarını Hesapla
  const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

  // Teklifi Veritabanına Kaydet
  const handleSaveProposal = async () => {
    if (!selectedCustomerId || !title) return alert("Lütfen müşteri seçin ve teklif başlığı girin.");
    
    setLoading(true);
    try {
      // 1. Ana teklifi kaydet
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          customer_id: selectedCustomerId,
          title: title,
          valid_until: validUntil || null,
          notes: notes,
          total_amount: totalAmount,
          status: 'draft'
        })
        .select('id')
        .single();

      if (proposalError) throw proposalError;

      // 2. Teklif kalemlerini (ürünleri) kaydet
      const proposalItems = items.map(item => ({
        proposal_id: proposalData.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase.from('proposal_items').insert(proposalItems);
      if (itemsError) throw itemsError;

      alert("Teklif başarıyla kaydedildi!");
      router.push('/dashboard'); 
    } catch (error) {
      console.error("Kayıt hatası:", error);
      alert("Teklif kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#f8fafb] font-sans text-slate-800">
      
      {/* SIDEBAR (Diğer sayfayla aynı tutarlılıkta) */}
      <aside className="w-full lg:w-72 bg-[#001a10] text-slate-300 flex flex-col h-auto lg:h-screen shadow-2xl z-20 shrink-0">
        <div className="p-6 lg:p-8 flex items-center justify-between lg:justify-center border-b border-[#008651]/20 w-full bg-[#00150d]">
          <div className="block h-12 w-44 relative">
            <img src="/images/logo/logo.png" alt="Logo" className="h-full w-full object-contain brightness-110" />
          </div>
        </div>
        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible px-4 lg:px-6 py-4 lg:py-8 gap-2 lg:space-y-2 whitespace-nowrap scrollbar-none">
          <a onClick={() => router.push('/dashboard')} className="flex items-center gap-3 px-4 py-3 hover:bg-[#008651]/10 hover:text-white rounded-xl text-xs lg:text-sm font-medium transition-all cursor-pointer">
            <LayoutDashboard className="w-4 h-4 lg:w-5 lg:h-5 text-slate-500" /> <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#008651] text-white rounded-xl shadow-lg shadow-[#008651]/20 text-xs lg:text-sm font-bold">
            <FileText className="w-4 h-4 lg:w-5 lg:h-5" /> <span>Create Proposal</span>
          </a>
        </nav>
      </aside>

      {/* ANA İÇERİK ALANI */}
      <main className="flex-1 overflow-y-auto lg:h-screen">
        
        <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-6 flex items-center gap-4 sticky top-0 z-10">
          <button onClick={() => router.push('/dashboard')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Yeni B2B Teklifi Oluştur</h1>
            <p className="text-slate-400 text-xs lg:text-sm font-medium">Kayıtlı müşterileriniz için özel iskontolu teklif hazırlayın.</p>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-[1000px] mx-auto w-full space-y-8">
          
          {/* Müşteri ve Başlık Bilgileri */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Müşteri Seçin *</label>
                <select 
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 ring-[#008651]/20"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Müşteri Seç --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || `${c.first_name} ${c.last_name}`} - {c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Geçerlilik Tarihi</label>
                <input 
                  type="date"
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 ring-[#008651]/20"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>

            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teklif Başlığı *</label>
              <input 
                type="text"
                placeholder="Örn: 2026 Yıllık Toner Tedarik Teklifi"
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 ring-[#008651]/20"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          {/* Teklif Kalemleri (Ürünler) */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Teklif Kalemleri</h3>
              <button onClick={addItem} className="flex items-center gap-2 text-xs font-bold bg-[#008651]/10 text-[#008651] px-4 py-2 rounded-lg hover:bg-[#008651]/20 transition-colors">
                <Plus className="w-4 h-4" /> Ürün Ekle
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="w-full md:flex-1">
                    <input 
                      type="text" placeholder="Ürün veya Hizmet Adı" 
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-3 py-2 outline-none"
                      value={item.product_name}
                      onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-24">
                    <input 
                      type="number" min="1" placeholder="Adet" 
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-3 py-2 outline-none"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-full md:w-32 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" placeholder="Birim Fiyat" 
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg pl-7 pr-3 py-2 outline-none"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-full md:w-32 text-right">
                    <p className="text-sm font-black text-slate-900">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </p>
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(index)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="w-full md:w-1/2">
                <textarea 
                  placeholder="Müşteriye özel notlar veya şartlar..." 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none min-h-[100px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="w-full md:w-1/2 flex flex-col items-end text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Genel Toplam</p>
                <h3 className="text-4xl font-black text-[#008651]">${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</h3>
                
                <button 
                  onClick={handleSaveProposal}
                  disabled={loading}
                  className="mt-6 flex items-center gap-2 bg-[#008651] text-white px-8 py-4 rounded-xl font-bold text-sm shadow-lg shadow-[#008651]/30 hover:bg-[#006b41] transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Taslağı Kaydet
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}