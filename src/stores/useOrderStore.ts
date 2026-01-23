import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isMockMode } from '@/lib/supabase';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    image: string;
    modifiers?: string[];
    user?: string;
}

export interface Order {
    id: string;
    tableId: string;
    items: OrderItem[];
    status: OrderStatus;
    createdAt: Date;
    total: number;
}

export interface BillingInfo {
    method: 'split_equally' | 'individual' | 'full_table';
    payer?: string;
    paymentType?: 'card' | 'cash' | 'digital_wallet';
    isPaid: boolean;
}

interface OrderState {
    items: OrderItem[];
    orders: Order[];
    tableId: string;
    total: number;
    billing: BillingInfo;

    // Cart Actions
    addItem: (item: Omit<OrderItem, 'quantity'> & { quantity?: number }, user?: string) => void;
    removeItem: (itemId: string, user?: string) => void;
    clearCart: () => void;

    // Order Actions
    placeOrder: () => Promise<void>;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    updateQuantity: (itemId: string, user: string | undefined, quantity: number) => void;
    setTableId: (id: string) => void;
    fetchOrders: () => Promise<void>;
    setOrders: (orders: Order[]) => void;

    // Billing Actions
    updateBilling: (info: Partial<BillingInfo>) => void;
}

export const useOrderStore = create<OrderState>()(
    persist(
        (set, get) => ({
            items: [],
            orders: [],
            tableId: 'MESA-01',
            total: 0,
            billing: {
                method: 'full_table',
                isPaid: false
            },

            addItem: (item, user) => set((state) => {
                // We check for existing item by ID, user AND modifiers (if any)
                const existingItem = state.items.find((i) =>
                    i.id === item.id &&
                    i.user === user &&
                    JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
                );

                const quantityToAdd = item.quantity || 1;

                let updatedItems;
                if (existingItem) {
                    updatedItems = state.items.map((i) =>
                        (i.id === item.id && i.user === user && JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers))
                            ? { ...i, quantity: i.quantity + quantityToAdd }
                            : i
                    );
                } else {
                    updatedItems = [...state.items, { ...item, quantity: quantityToAdd, user }];
                }
                return { items: updatedItems, total: calculateTotal(updatedItems) };
            }),

            removeItem: (itemId, user) => set((state) => {
                const updatedItems = state.items.filter((i) => !(i.id === itemId && i.user === user));
                return { items: updatedItems, total: calculateTotal(updatedItems) };
            }),

            updateQuantity: (itemId, user, quantity) => set((state) => {
                if (quantity <= 0) {
                    const updatedItems = state.items.filter((i) => !(i.id === itemId && i.user === user));
                    return { items: updatedItems, total: calculateTotal(updatedItems) };
                }
                const updatedItems = state.items.map((i) =>
                    (i.id === itemId && i.user === user) ? { ...i, quantity } : i
                );
                return { items: updatedItems, total: calculateTotal(updatedItems) };
            }),

            clearCart: () => set({ items: [], total: 0 }),

            fetchOrders: async () => {
                if (isMockMode) {
                    console.log('Mock Mode: Skipping remote fetch');
                    return;
                }

                try {
                    const { data, error } = await supabase
                        .from('orders')
                        .select('*, order_items(*)')
                        .order('created_at', { ascending: false });

                    if (error) throw error;

                    if (data) {
                        const formattedOrders: Order[] = data.map((d: any) => ({
                            id: d.id,
                            tableId: d.table_id,
                            status: d.status,
                            createdAt: new Date(d.created_at),
                            total: d.total,
                            items: (d.order_items || []).map((i: any) => ({
                                id: i.id,
                                name: i.name,
                                price: i.price,
                                quantity: i.quantity,
                                category: i.category,
                                image: i.image,
                                user: i.user, // Ensure user is mapping
                                modifiers: i.modifiers
                            }))
                        }));
                        set({ orders: formattedOrders });
                    }
                } catch (error) {
                    console.error('Fetch orders error:', error);
                }
            },

            setOrders: (orders) => set({ orders }),

            placeOrder: async () => {
                const { items, tableId } = get();
                const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                // 1. Create Order
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert([{ table_id: tableId, total, status: 'pending' }])
                    .select()
                    .single();

                if (orderError) {
                    console.error('Error placing order:', orderError);

                    // MOCK MODE FALLBACK
                    if (isMockMode) {
                        console.log('Using Mock Mode for Order Placement');
                        const mockOrderId = `MOCK-${Math.random().toString(36).substr(2, 9)}`;
                        const mockOrder: Order = {
                            id: mockOrderId,
                            tableId,
                            status: 'pending',
                            createdAt: new Date(),
                            total,
                            items: items.map(item => ({ ...item }))
                        };

                        set((state) => ({
                            orders: [mockOrder, ...state.orders],
                            items: [],
                            total: 0
                        }));
                        return;
                    }
                    return;
                }

                // 2. Create Order Items
                const itemsToInsert = items.map(item => ({
                    order_id: orderData.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    category: item.category,
                    image: item.image,
                    user: item.user,
                    modifiers: item.modifiers
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(itemsToInsert);

                if (itemsError) {
                    console.error('Error adding order items:', itemsError);
                    return;
                }

                set({ items: [], total: 0 });
                await get().fetchOrders();
            },

            updateOrderStatus: async (orderId, status) => {
                // Update local state IMMEDIATELY for snappy UI (Optimistic UI)
                set((state) => ({
                    orders: state.orders.map((o) => o.id === orderId ? { ...o, status } : o),
                }));

                if (!isMockMode) {
                    const { error } = await supabase
                        .from('orders')
                        .update({ status })
                        .eq('id', orderId);

                    if (error) {
                        console.error('Error updating order status in Supabase:', error);
                    }
                } else {
                    console.log('Mock Mode: Local status update only');
                }
            },

            setTableId: (id) => set({ tableId: id }),

            updateBilling: (info) => set((state) => ({
                billing: { ...state.billing, ...info }
            })),
        }),
        {
            name: 'restaurant-orders-storage',
            partialize: (state) => ({ items: state.items, tableId: state.tableId, billing: state.billing }),
        }
    )
);

function calculateTotal(items: OrderItem[]) {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
}
