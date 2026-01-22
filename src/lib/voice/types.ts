export type NavigationSection = "home" | "comidas" | "bebidas" | "postres" | "cart" | "reseñas" | "filtro" | "kds";

export interface NavigateArgs {
    section_name: NavigationSection;
    context_data?: string;
}

export interface DishModification {
    type: 'remove' | 'add' | 'substitute' | 'preference';
    ingredient?: string;          // "cebolla", "tomate"
    instruction?: string;         // "baja en sal", "poco hecho", "bien caliente"
    substitute_with?: string;     // "sin gluten" → "pan sin gluten"
}

export interface CartItemArgs {
    item_name: string;
    quantity: number;
    notes: string;
    assigned_to?: string;
    modifications?: DishModification[];  // ← Nuevo: Modificaciones estructuradas
}

export interface UpdateOrderArgs {
    action: "add" | "remove" | "update";
    items: CartItemArgs[];
}

export interface BillingArgs {
    method: "split_equally" | "individual" | "full_table";
    payer?: string;
    payment_type?: "card" | "cash" | "digital_wallet";
}

export interface SplitPaymentDetails {
    person_name: string;
    items: string[];
    total: number;
}

// Event types for the Event Bus
export type VoiceEvent =
    | { type: 'navigate_to_section'; payload: NavigateArgs }
    | { type: 'update_order_cart'; payload: UpdateOrderArgs }
    | { type: 'manage_billing'; payload: BillingArgs }
    | { type: 'confirm_order'; payload: {} }
    | { type: 'agent_response'; payload: { text: string; isFinal: boolean } }
    | { type: 'agent_status'; payload: { status: 'listening' | 'processing' | 'speaking' | 'idle' } }
    | { type: 'split_payment'; payload: { splits: SplitPaymentDetails[] } }
    | { type: 'modification_confirmation'; payload: { dish_name: string; modifications: DishModification[]; message: string } };
