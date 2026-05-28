import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Yolu klasör yapına göre ayarladık

export async function POST(request: Request) {
  try {
    // 1. WooCommerce'den gelen JSON verisini al
    const payload = await request.json();

    // WooCommerce webhook'unun doğrulama (ping) isteği olup olmadığını kontrol et
    if (payload.webhook_id) {
      return NextResponse.json({ message: 'Webhook başarıyla bağlandı!' }, { status: 200 });
    }

    // 2. MÜŞTERİ BİLGİSİNİ KAYDET VEYA GÜNCELLE (Upsert)
    // Siparişin içindeki billing (fatura) bilgilerini kullanıyoruz
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .upsert({
        woo_customer_id: payload.customer_id || null,
        first_name: payload.billing.first_name,
        last_name: payload.billing.last_name,
        email: payload.billing.email,
        phone: payload.billing.phone,
        company_name: payload.billing.company,
      }, { onConflict: 'email' }) // E-posta varsa üzerine yazar, yoksa yeni oluşturur
      .select('id')
      .single();

    if (customerError) throw customerError;
    const supabaseCustomerId = customerData.id;

    // 3. SİPARİŞİ KAYDET (orders tablosu)
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .upsert({
        woo_order_id: payload.id,
        customer_id: supabaseCustomerId,
        status: payload.status,
        total_amount: parseFloat(payload.total),
      }, { onConflict: 'woo_order_id' })
      .select('id')
      .single();

    if (orderError) throw orderError;
    const supabaseOrderId = orderData.id;

    // 4. SİPARİŞ KALEMLERİNİ (order_items) VE TONER ALARMLARINI (replenishment_tasks) İŞLE
    const lineItems = payload.line_items || [];
    
    for (const item of lineItems) {
      // Önce bu ürünün Supabase'de olup olmadığına bak (SKU veya woo_product_id üzerinden)
      let { data: productData } = await supabase
        .from('products')
        .select('id, estimated_lifespan_days')
        .eq('woo_product_id', item.product_id)
        .single();

      // Eğer ürün Supabase'de yoksa, temel bilgileriyle hızlıca oluştur (Sonradan güncellenebilir)
      if (!productData) {
        const { data: newProduct } = await supabase
          .from('products')
          .insert({
            woo_product_id: item.product_id,
            sku: item.sku || `SKU-${item.product_id}`,
            name: item.name,
            price: parseFloat(item.price),
            stock_quantity: 0,
            estimated_lifespan_days: 60 // Varsayılan toner ömrü
          })
          .select('id, estimated_lifespan_days')
          .single();
          
        productData = newProduct;
      }

      if (productData) {
        // Sipariş kalemini order_items tablosuna ekle
        await supabase.from('order_items').insert({
          order_id: supabaseOrderId,
          product_id: productData.id,
          quantity: item.quantity,
          price: parseFloat(item.price)
        });

        // TONER DÖNGÜSÜ (REPLENISHMENT) OTOMASYONU
        // Eğer ürünün bir ömrü varsa ve sipariş tamamlanmışsa (processing veya completed), hedef tarihi hesaplayıp alarm oluştur
        if (['processing', 'completed'].includes(payload.status) && productData.estimated_lifespan_days > 0) {
          const triggerDate = new Date();
          triggerDate.setDate(triggerDate.getDate() + productData.estimated_lifespan_days);

          await supabase.from('replenishment_tasks').insert({
            customer_id: supabaseCustomerId,
            product_id: productData.id,
            related_order_id: supabaseOrderId,
            trigger_date: triggerDate.toISOString(),
            status: 'pending'
          });
        }
      }
    }

    // Her şey başarılıysa WooCommerce'e 200 OK yanıtı dön
    return NextResponse.json({ success: true, order_id: supabaseOrderId }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook işleme hatası:', error.message);
    return NextResponse.json({ error: 'Webhook işlenemedi', details: error.message }, { status: 500 });
  }
}