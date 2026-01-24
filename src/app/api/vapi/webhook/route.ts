import { NextRequest, NextResponse } from 'next/server';
import { supabaseTest } from '@/lib/supabaseTest';

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const { message } = payload;

        // Solo procesamos llamadas a herramientas (tool-calls)
        if (message?.type === 'tool-calls') {
            const toolCalls = message.toolCalls;
            const results = [];

            for (const toolCall of toolCalls) {
                const { name, args, id } = toolCall;

                if (name === 'agregar_item') {
                    const { item_id, quantity = 1, modifications = [] } = args;

                    // 1. Validar contra Supabase (Entorno Test - Tabla 'menu')
                    const { data: item, error: fetchError } = await supabaseTest
                        .from('menu')
                        .select('*')
                        .eq('id', item_id)
                        .single();

                    if (fetchError || !item) {
                        results.push({
                            toolCallId: id,
                            result: `Error: El plato con ID ${item_id} no existe en la carta de Nou Espantall.`
                        });
                        continue;
                    }

                    // 2. Registrar el intento de pedido en la base de datos de test
                    const { data: order, error: orderError } = await supabaseTest
                        .from('pedidos')
                        .insert([{
                            cliente_nombre: 'Cliente de Voz (vAPI)',
                            total: (item.precio * quantity),
                            canal: 'voz'
                        }])
                        .select()
                        .single();

                    if (!orderError && order) {
                        await supabaseTest.from('pedido_items').insert([{
                            pedido_id: order.id,
                            menu_id: item.id,
                            cantidad: quantity,
                            modifications: modifications,
                            precio_unitario: item.precio
                        }]);
                    }

                    results.push({
                        toolCallId: id,
                        result: `Éxito: Se ha registrado ${quantity}x ${item.nombre_es} en la base de datos.`
                    });
                }

                else if (name === 'navegar') {
                    const { section } = args;
                    results.push({
                        toolCallId: id,
                        result: `Navegando a la sección: ${section}`
                    });
                }

                else if (name === 'limpiar_carrito') {
                    results.push({
                        toolCallId: id,
                        result: "Carrito vaciado correctamente."
                    });
                }
            }

            return NextResponse.json({
                results: results
            });
        }

        // Respuesta genérica para otros tipos de mensajes de vAPI
        return NextResponse.json({ status: 'received' });

    } catch (error: any) {
        console.error('Vapi Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
