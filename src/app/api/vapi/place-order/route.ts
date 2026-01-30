import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Forzamos modo dinámico para que Next.js no intente pre-renderizar en build sin env vars
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase environment variables');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/vapi/place-order
 */
export async function POST(req: NextRequest) {
    let currentToolCallId: string | undefined;
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const rawBody = await req.text();
        console.log('📬 Body RAW recibido en Vercel:', rawBody);

        if (!rawBody) {
            return NextResponse.json({ error: 'Body vacío' }, { status: 400 });
        }

        const payload = JSON.parse(rawBody);

        // Vapi puede enviar el toolCall dentro de message o directamente en el body
        const message = payload.message || payload;
        const toolCall = message.toolCallList?.[0] || message.toolCalls?.[0] || payload.toolCallList?.[0];

        if (!toolCall) {
            console.error('❌ No tool call found in payload');
            return NextResponse.json({
                error: 'No tool call found',
                received_keys: Object.keys(payload)
            }, { status: 400 });
        }

        currentToolCallId = toolCall.id;

        // Parsear argumentos
        const args = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;

        const { items, nombre_cliente, mesa, tipo_entrega, notas, total } = args;

        console.log('📦 Pedido Vapi recibido:', { items, total, nombre_cliente, mesa });

        // 1. Guardar en la tabla 'orders'
        const { data: pedido, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                table_id: mesa || 'Mesa-Voz',
                total: total || 0,
                status: 'pending',
                source: 'vapi',
                notes: notas || null,
                delivery_type: tipo_entrega || 'table',
                metadata: {
                    customer_name: nombre_cliente || 'Cliente de Voz',
                    original_vapi_args: args
                }
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Guardar los items en 'order_items'
        if (items && Array.isArray(items)) {
            const itemsToInsert = items.map((item: any) => ({
                order_id: pedido.id,
                dish_id: item.id || item.dish_id || 'unknown',
                dish_name: item.name || item.dish_name || 'Plato',
                quantity: item.quantity || 1,
                unit_price: item.price || 0,
                diner_name: nombre_cliente || 'General',
                modifications: item.modifications || [],
            }));

            const { error: itemsError } = await supabaseAdmin
                .from('order_items')
                .insert(itemsToInsert);

            if (itemsError) console.error('⚠️ Error guardando items:', itemsError);
        }

        // 3. Registrar evento en analytics (ROI Tracking)
        await supabaseAdmin.from('analytics_events').insert([{
            event_type: 'voice_order_placed',
            order_id: pedido.id,
            table_id: mesa,
            metadata: { items_count: items?.length || 0, total }
        }]);

        const numeroPedido = `PED-${pedido.id.slice(0, 8).toUpperCase()}`;

        // 4. Respuesta FORMATEADA PARA VAPI
        return NextResponse.json({
            results: [{
                toolCallId: currentToolCallId,
                result: JSON.stringify({
                    success: true,
                    mensaje: `¡Pedido ${numeroPedido} confirmado para ${nombre_cliente || 'mesa'}!`,
                    numero_pedido: numeroPedido,
                    total: total,
                    tiempo_estimado: '15-20 minutos'
                })
            }]
        });

    } catch (error: any) {
        console.error('❌ Error en el endpoint de Vapi:', error);

        return NextResponse.json({
            results: [{
                toolCallId: currentToolCallId,
                result: JSON.stringify({
                    success: false,
                    error: 'Lo siento, hubo un problema al procesar el pedido en el sistema.',
                    details: error.message
                })
            }]
        });
    }
}

// Habilitar GET para pruebas rápidas
export async function GET() {
    return NextResponse.json({ status: "place-order endpoint active" });
}
