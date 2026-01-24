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
                    const { item_id, quantity = 1, modifications = [], comensal = 'General' } = args;

                    // 1. Validar contra Supabase (Entorno Test - Tabla 'menu')
                    const { data: item, error: fetchError } = await supabaseTest
                        .from('menu')
                        .select('*')
                        .eq('id', item_id)
                        .single();

                    if (fetchError || !item) {
                        results.push({
                            toolCallId: id,
                            result: `Error: El plato ${item_id} no existe.`
                        });
                        continue;
                    }

                    // 2. Registrar el intento de pedido en la base de datos de test
                    const { data: order, error: orderError } = await supabaseTest
                        .from('pedidos')
                        .insert([{
                            cliente_nombre: comensal,
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
                        result: `Éxito: Se ha registrado ${quantity}x ${item.nombre_es} para ${comensal}.`
                    });
                }

                else if (name === 'obtener_total') {
                    const { comensal } = args;
                    let query = supabaseTest.from('pedidos').select('total');

                    if (comensal) {
                        query = query.eq('cliente_nombre', comensal);
                    }

                    const { data, error } = await query;
                    const total = data?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

                    results.push({
                        toolCallId: id,
                        result: comensal
                            ? `El total para ${comensal} es de ${total.toFixed(2)}€.`
                            : `El total acumulado de la mesa es de ${total.toFixed(2)}€.`
                    });
                }

                else if (name === 'navegar') {
                    const { section } = args;
                    results.push({
                        toolCallId: id,
                        result: `Navegando a la sección: ${section}`
                    });
                }

                else if (name === 'finalizar_pedido') {
                    const { customer_info, payment_intent } = args;

                    // Buscar el pedido pendiente más reciente para este contexto
                    const { data: latestOrder, error: findError } = await supabaseTest
                        .from('pedidos')
                        .select('id, total')
                        .eq('estado', 'pendiente')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (findError || !latestOrder) {
                        results.push({
                            toolCallId: id,
                            result: "No he encontrado ningún pedido pendiente para finalizar. ¿Deseas añadir algo más?"
                        });
                        continue;
                    }

                    // Actualizar el estado del pedido a 'en_cocina' (o similar)
                    const { error: updateError } = await supabaseTest
                        .from('pedidos')
                        .update({
                            estado: 'preparando',
                            cliente_nombre: customer_info || undefined
                        })
                        .eq('id', latestOrder.id);

                    if (updateError) {
                        results.push({
                            toolCallId: id,
                            result: "Hubo un error técnico al procesar el pedido. Por favor, inténtalo de nuevo."
                        });
                        continue;
                    }

                    results.push({
                        toolCallId: id,
                        result: `¡Perfecto! Tu pedido por un total de ${latestOrder.total}€ ha sido enviado a cocina. ${payment_intent ? `Prepararemos el cobro con ${payment_intent}.` : ''} ¡Muchas gracias!`
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
