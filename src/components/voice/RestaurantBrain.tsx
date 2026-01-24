'use client';

import { useConversation } from '@elevenlabs/react';
import { useEffect, useCallback } from 'react';

// ➤ DEFINICIÓN DE HERRAMIENTAS (Client-Side Tools)
// Esto es el equivalente a definir funciones en Python.
// Le decimos al Agente: "Estas son las funciones que puedes controlar en mi web".
const CLIENT_TOOLS = {
    navigate_to_section: {
        description: "Navega a una sección específica del menú (ej: bocadillos, entrantes, carrito)",
        parameters: {
            type: "object",
            properties: {
                section: {
                    type: "string",
                    enum: ["bocadillos", "entrantes", "tablas", "postres", "bebidas", "cart", "home", "reseñas"],
                    description: "La sección a la que ir"
                }
            },
            required: ["section"]
        }
    },
    add_to_cart: {
        description: "Añade un producto al carrito",
        parameters: {
            type: "object",
            properties: {
                item_name: { type: "string", description: "Nombre del producto" },
                quantity: { type: "number", description: "Cantidad" }
            },
            required: ["item_name"]
        }
    }
};

export function useRestaurantBrain(callbacks: {
    onNavigate: (section: string) => void;
    onAddToCart: (item: string, qty: number) => void;
}) {
    // Conectamos con el Agente usando el SDK Oficial
    const conversation = useConversation({
        // Callbacks cuando el Agente decide usar una herramienta
        onConnect: () => console.log('🟢 Voz Conectada'),
        onDisconnect: () => console.log('🔴 Voz Desconectada'),
        onMessage: (msg) => console.log('💬 Mensaje:', msg),
        onError: (err) => console.error('⚠️ Error Voz:', err),

        // ➤ AQUÍ ESTÁ LA MAGIA: Mapeo de Herramientas -> Código
        clientTools: {
            navigate_to_section: async ({ section }: { section: string }) => {
                console.log(`🤖 Ejecutando Nav: ${section}`);
                callbacks.onNavigate(section);
                return `Navegando a la sección ${section}`;
            },
            add_to_cart: async ({ item_name, quantity }: { item_name: string, quantity?: number }) => {
                console.log(`🤖 Ejecutando Add: ${item_name}`);
                callbacks.onAddToCart(item_name, quantity || 1);
                return `Añadido ${quantity || 1} ${item_name} al carrito`;
            }
        }
    });

    return conversation;
}
