import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

/**
 * Schema de validación para pedidos entrantes
 * Usando Zod para type-safety y validación runtime
 */
const OrderItemSchema = z.object({
    dish_id: z.string().min(1, 'dish_id es requerido'),
    dish_name: z.string().optional(), // Lo buscaremos en el menú si no viene
    quantity: z.number().int().min(1).max(50, 'Cantidad máxima: 50'),
    unit_price: z.number().optional(), // Lo buscaremos en el menú si no viene
    diner_name: z.string().default('General'),
    modifications: z.array(z.string()).optional(),
    category: z.string().optional(),
    image_url: z.string().optional(),
});

const PlaceOrderSchema = z.object({
    table_id: z.string().min(1, 'table_id es requerido'),
    items: z.array(OrderItemSchema).min(1, 'Debe incluir al menos un item'),
    source: z.enum(['vapi', 'manual', 'qr', 'n8n']).default('vapi'),
});

type PlaceOrderRequest = z.infer<typeof PlaceOrderSchema>;

/**
 * Carga el menú completo para validación y enriquecimiento de datos
 */
async function getMenuData() {
    try {
        // Intentar cargar desde Supabase primero
        const { data, error } = await supabase
            .from('menu')
            .select('*');

        if (!error && data && data.length > 0) {
            return data;
        }
    } catch (e) {
        console.log('Supabase menu not available, using local fallback');
    }

    // Fallback: cargar desde archivo local
    const menuData = await import('@/lib/menu.json');
    return menuData.categories.flatMap((cat: any) => cat.items);
}

/**
 * Enriquece los items del pedido con datos del menú
 */
async function enrichOrderItems(items: PlaceOrderRequest['items']) {
    const menuData = await getMenuData();

    return items.map(item => {
        // Buscar el plato en el menú
        const menuItem = menuData.find((dish: any) => {
            const dishId = dish.id?.toLowerCase();
            const searchId = item.dish_id.toLowerCase();

            return dishId === searchId ||
                dish.name?.es?.toLowerCase().includes(searchId) ||
                dish.name?.en?.toLowerCase().includes(searchId);
        });

        if (!menuItem) {
            throw new Error(`Plato no encontrado: ${item.dish_id}`);
        }

        return {
            dish_id: menuItem.id,
            dish_name: item.dish_name || menuItem.name?.es || menuItem.name,
            quantity: item.quantity,
            unit_price: item.unit_price ?? menuItem.price ?? 0,
            diner_name: item.diner_name,
            modifications: item.modifications || [],
            category: item.category || menuItem.category,
            image_url: item.image_url || menuItem.image,
        };
    });
}

/**
 * POST /api/orders/place
 * 
 * Endpoint principal para crear pedidos desde VAPI, n8n o cualquier fuente externa
 * 
 * @returns {object} { success, order_id, total, items_count }
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        // 1. Parse y validación del body
        const rawBody = await req.json();
        const validatedData = PlaceOrderSchema.parse(rawBody);

        console.log(`📥 New order request for table: ${validatedData.table_id}`);

        // 2. Enriquecer items con datos del menú
        const enrichedItems = await enrichOrderItems(validatedData.items);

        // 3. Calcular total
        const total = enrichedItems.reduce(
            (acc, item) => acc + (item.unit_price * item.quantity),
            0
        );

        // 4. Crear el pedido en Supabase
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([{
                table_id: validatedData.table_id,
                total: total,
                source: validatedData.source,
                status: 'pending',
            }])
            .select()
            .single();

        if (orderError) {
            console.error('❌ Error creating order:', orderError);
            throw new Error(`Database error: ${orderError.message}`);
        }

        console.log(`✅ Order created: ${orderData.id}`);

        // 5. Insertar items del pedido
        const itemsToInsert = enrichedItems.map(item => ({
            order_id: orderData.id,
            ...item,
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('❌ Error inserting order items:', itemsError);

            // Rollback: eliminar el pedido si falló la inserción de items
            await supabase
                .from('orders')
                .delete()
                .eq('id', orderData.id);

            throw new Error(`Failed to add items: ${itemsError.message}`);
        }

        // 6. Registrar evento de analytics
        await supabase.from('analytics_events').insert([{
            event_type: 'order_placed',
            order_id: orderData.id,
            table_id: validatedData.table_id,
            session_id: req.headers.get('x-session-id') || undefined,
            user_agent: req.headers.get('user-agent') || undefined,
            metadata: {
                source: validatedData.source,
                items_count: enrichedItems.length,
                total_amount: total,
                response_time_ms: Date.now() - startTime,
            },
        }]);

        const responseTime = Date.now() - startTime;
        console.log(`⚡ Order processed in ${responseTime}ms`);

        // 7. Respuesta exitosa
        return NextResponse.json({
            success: true,
            order_id: orderData.id,
            total: parseFloat(total.toFixed(2)),
            items_count: enrichedItems.length,
            estimated_time_minutes: 15, // TODO: Calcular dinámicamente según carga
            response_time_ms: responseTime,
        }, { status: 201 });

    } catch (error: any) {
        console.error('❌ Error in /api/orders/place:', error);

        // Manejar errores de validación de Zod
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: 'Validation error',
                details: error.issues.map((issue: z.ZodIssue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            }, { status: 400 });
        }

        // Error genérico
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error',
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}

/**
 * GET /api/orders/place?table_id=MESA-01
 * 
 * Obtener pedidos de una mesa (para testing y debugging)
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('table_id');

    if (!tableId) {
        return NextResponse.json({
            success: false,
            error: 'table_id query parameter is required',
        }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        order_items (*)
      `)
            .eq('table_id', tableId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            orders: data || [],
            count: data?.length || 0,
        });

    } catch (error: any) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
