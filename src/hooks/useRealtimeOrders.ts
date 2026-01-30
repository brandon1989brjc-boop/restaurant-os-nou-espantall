'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase, isMockMode } from '@/lib/supabase';
import { useOrderStore, Order, OrderItem } from '@/stores/useOrderStore';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook para sincronización Real-time de pedidos con Supabase
 * 
 * Escucha cambios en las tablas `orders` y `order_items` y actualiza
 * el estado de Zustand automáticamente.
 * 
 * @param tableId - ID de la mesa a monitorear
 * @param enabled - Si está habilitado (default: true)
 * 
 * @example
 * ```tsx
 * function RestaurantMenu() {
 *   const tableId = useOrderStore(state => state.tableId);
 *   useRealtimeOrders(tableId);
 *   
 *   return <div>...</div>
 * }
 * ```
 */
export function useRealtimeOrders(tableId: string, enabled: boolean = true) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const { setOrders, fetchOrders } = useOrderStore();

    /**
     * Fetch detallado de un pedido específico con sus items
     */
    const fetchOrderDetails = useCallback(async (orderId: string) => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
          *,
          order_items (*)
        `)
                .eq('id', orderId)
                .single();

            if (error) {
                console.error('Error fetching order details:', error);
                return null;
            }

            if (!data) return null;

            // Transformar a formato Order
            const order: Order = {
                id: data.id,
                tableId: data.table_id,
                status: data.status,
                total: parseFloat(data.total),
                createdAt: new Date(data.created_at),
                items: (data.order_items || []).map((item: any): OrderItem => ({
                    id: item.dish_id,
                    name: item.dish_name,
                    price: parseFloat(item.unit_price),
                    quantity: item.quantity,
                    category: item.category || '',
                    image: item.image_url || '',
                    modifiers: item.modifications || [],
                    user: item.diner_name,
                })),
            };

            // Actualizar el store de Zustand
            useOrderStore.setState((state) => {
                const existingIndex = state.orders.findIndex(o => o.id === order.id);

                if (existingIndex >= 0) {
                    // Update existing order
                    const updatedOrders = [...state.orders];
                    updatedOrders[existingIndex] = order;
                    return { orders: updatedOrders };
                } else {
                    // Add new order
                    return { orders: [order, ...state.orders] };
                }
            });

            console.log(`✅ Order synced: ${orderId}`);
            return order;

        } catch (error) {
            console.error('Error in fetchOrderDetails:', error);
            return null;
        }
    }, []);

    /**
     * Setup de la suscripción Real-time
     */
    useEffect(() => {
        // Skip en modo mock
        if (isMockMode || !enabled) {
            console.log('ℹ️ Real-time orders disabled (Mock Mode or disabled)');
            return;
        }

        if (!tableId) {
            console.warn('⚠️ No tableId provided for real-time orders');
            return;
        }

        console.log(`🔄 Setting up real-time orders for table: ${tableId}`);

        // Crear canal único por mesa
        const channelName = `orders-table-${tableId}`;
        const channel = supabase.channel(channelName);

        // Listener 1: Nuevos pedidos (INSERT)
        channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'orders',
                filter: `table_id=eq.${tableId}`,
            },
            (payload) => {
                console.log('🆕 New order detected:', payload.new);
                fetchOrderDetails(payload.new.id);
            }
        );

        // Listener 2: Actualización de estado (UPDATE)
        channel.on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `table_id=eq.${tableId}`,
            },
            (payload) => {
                console.log('🔄 Order updated:', payload.new);
                fetchOrderDetails(payload.new.id);
            }
        );

        // Listener 3: Nuevos items añadidos a pedidos existentes
        channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'order_items',
            },
            (payload) => {
                console.log('🍽️ New item added:', payload.new);
                // Fetch el pedido completo para actualizar
                if (payload.new.order_id) {
                    fetchOrderDetails(payload.new.order_id);
                }
            }
        );

        // Suscribirse al canal
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`✅ Subscribed to real-time orders for ${tableId}`);

                // Hacer un fetch inicial para sincronizar estado
                fetchOrders();
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Real-time subscription error');
            } else if (status === 'TIMED_OUT') {
                console.error('⏱️ Real-time subscription timed out');
            }
        });

        channelRef.current = channel;

        // Cleanup: desuscribirse al desmontar
        return () => {
            console.log(`🔌 Unsubscribing from real-time orders for ${tableId}`);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [tableId, enabled, fetchOrderDetails, fetchOrders]);

    // Retornar una función para forzar re-sync manual si es necesario
    return {
        forceSync: useCallback(() => {
            console.log('🔄 Manual sync triggered');
            fetchOrders();
        }, [fetchOrders]),
    };
}

/**
 * Hook simplificado para componentes que solo necesitan saber
 * si hay conexión real-time activa
 */
export function useRealtimeStatus() {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (isMockMode) {
            setIsConnected(false);
            return;
        }

        // Monitorear estado de conexión de Supabase
        const channel = supabase.channel('realtime-status-check');

        channel.subscribe((status) => {
            setIsConnected(status === 'SUBSCRIBED');
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return isConnected;
}

// Export useState que faltaba
import { useState } from 'react';
