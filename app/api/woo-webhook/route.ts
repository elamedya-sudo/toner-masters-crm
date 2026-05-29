// app/api/woo-webhook/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const event = request.headers.get('x-wc-webhook-event');
    const rawBody = await request.text();
    let payload: any = {};

    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params);
    }

    if (event === 'ping' || payload.webhook_id) {
      return NextResponse.json({ message: 'Webhook connected successfully!' }, { status: 200 });
    }

    if (!payload.id || !payload.billing) {
      return NextResponse.json({ error: 'Missing order details.' }, { status: 400 });
    }

    const email = payload.billing?.email || `no-email-${payload.id}@tonermasters.com.au`;
    
    // Müşteri Kaydı
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .upsert({
        woo_customer_id: payload.customer_id || null,
        first_name: payload.billing?.first_name || 'Guest',
        last_name: payload.billing?.last_name || 'Customer',
        email: email,
        phone: payload.billing?.phone || '',
        company_name: payload.billing?.company || '',
      }, { onConflict: 'email' }) 
      .select('id')
      .single();

    if (customerError) throw customerError;
    const supabaseCustomerId = customerData.id;

    // Sipariş Kaydı (order_number EKLENDİ)
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .upsert({
        woo_order_id: payload.id,
        order_number: payload.number || String(payload.id),
        customer_id: supabaseCustomerId,
        status: payload.status,
        total_amount: parseFloat(payload.total || 0),
      }, { onConflict: 'woo_order_id' })
      .select('id')
      .single();

    if (orderError) throw orderError;
    const supabaseOrderId = orderData.id;

    const lineItems = payload.line_items || [];
    
    // Sipariş Kalemleri ve Alarmlar
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
            name: item.name || 'Unnamed Product',
            price: parseFloat(item.price || 0),
            stock_quantity: 0,
            estimated_lifespan_days: 60
          })
          .select('id, estimated_lifespan_days')
          .single();
          
        productData = newProduct;
      }

      if (productData) {
        await supabase.from('order_items').upsert({
          order_id: supabaseOrderId,
          product_id: productData.id,
          quantity: item.quantity || 1,
          price: parseFloat(item.price || 0)
        }, { onConflict: 'id' });

        // Mükerrer Alarm Engelleyici
        const { data: existingTask } = await supabase
          .from('replenishment_tasks')
          .select('id')
          .eq('related_order_id', supabaseOrderId)
          .eq('product_id', productData.id)
          .maybeSingle();

        if (!existingTask && ['processing', 'completed'].includes(payload.status) && productData.estimated_lifespan_days > 0) {
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
    console.error('Webhook error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed', details: error.message }, { status: 500 });
  }
}