import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    // Gelen JSON verisini ve başlıkları (Headers) al
    const payload = await request.json();
    const event = request.headers.get('x-wc-webhook-event'); // WooCommerce'in gönderdiği olay türü

    // 1. PING (TEST) KONTROLÜ
    // WooCommerce kaydet tuşuna basınca veya test yaparken 'ping' olayı gönderir
    if (event === 'ping' || payload.webhook_id) {
      console.log('WooCommerce Ping başarılı!');
      return NextResponse.json({ message: 'Webhook başarıyla bağlandı!' }, { status: 200 });
    }

    // Gelen veride sipariş numarası (id) veya fatura (billing) detayı yoksa işlemi durdur (çökmeyi engeller)
    if (!payload.id || !payload.billing) {
      return NextResponse.json({ error: 'Sipariş detayları eksik veya geçersiz format.' }, { status: 400 });
    }

    // 2. MÜŞTERİ BİLGİSİNİ KAYDET VEYA GÜNCELLE
    // Her ihtimale karşı '?.' (Optional Chaining) kullanarak verinin boş gelme ihtimaline karşı sistemi koruyoruz
    const email = payload.billing?.email || `no-email-${payload.id}@tonermasters.com.au`;
    
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .upsert({
        woo_customer_id: payload.customer_id || null,
        first_name: payload.billing?.first_name || 'Bilinmeyen',
        last_name: payload.billing?.last_name || 'Müşteri',
        email: email,
        phone: payload.billing?.phone || '',
        company_name: payload.billing?.company || '',
      }, { onConflict: 'email' }) 
      .select('id')
      .single();

    if (customerError) throw customerError;
    const supabaseCustomerId = customerData.id;

    // 3. SİPARİŞİ KAYDET
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .upsert({
        woo_order_id: payload.id,
        customer_id: supabaseCustomerId,
        status: payload.status,
        total_amount: parseFloat(payload.total || 0),
      }, { onConflict: 'woo_order_id' })
      .select('id')
      .single();

    if (orderError) throw orderError;
    const supabaseOrderId = orderData.id;

    // 4. SİPARİŞ KALEMLERİ VE TONER ALARMLARI
    const lineItems = payload.line_items || [];
    
    for (const item of lineItems) {
      let { data: productData } = await supabase
        .from('products')
        .select('id, estimated_lifespan_days')
        .eq('woo_product_id', item.product_id)
        .single();

      if (!productData) {
        const { data: newProduct } = await supabase
          .from('products')
          .insert({
            woo_product_id: item.product_id,
            sku: item.sku || `SKU-${item.product_id}`,
            name: item.name || 'İsimsiz Ürün',
            price: parseFloat(item.price || 0),
            stock_quantity: 0,
            estimated_lifespan_days: 60
          })
          .select('id, estimated_lifespan_days')
          .single();
          
        productData = newProduct;
      }

      if (productData) {
        await supabase.from('order_items').insert({
          order_id: supabaseOrderId,
          product_id: productData.id,
          quantity: item.quantity || 1,
          price: parseFloat(item.price || 0)
        });

        // Eğer sipariş durumu 'processing' veya 'completed' ise alarm kur
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

    return NextResponse.json({ success: true, order_id: supabaseOrderId }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook işleme hatası:', error.message);
    return NextResponse.json({ error: 'Webhook işlenemedi', details: error.message }, { status: 500 });
  }
}