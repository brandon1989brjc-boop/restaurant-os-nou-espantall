import Fuse from 'fuse.js';
import { LocalizedMenuItem } from '@/types/menu';

// Tipos de acciones que nuestro cerebro entiende
export type NativeIntent =
    | { type: 'NAVIGATE'; section: string }
    | { type: 'ADD_TO_CART'; item: LocalizedMenuItem; quantity: number }
    | { type: 'BILL'; action: 'view' | 'pay' }
    | { type: 'UNKNOWN'; text: string };

export class NativeBrain {
    private menuItems: LocalizedMenuItem[];
    private fuse: Fuse<LocalizedMenuItem>;

    constructor(menuItems: LocalizedMenuItem[]) {
        this.menuItems = menuItems;
        // Configuramos Fuse para buscar en nombres y descripciones con "tolerancia a fallos"
        this.fuse = new Fuse(menuItems, {
            keys: ['name', 'description', 'category'],
            threshold: 0.4, // 0.0 = coincidencia exacta, 1.0 = coincide con todo. 0.4 es buen balance.
            distance: 100,
        });
    }

    public process(text: string): NativeIntent {
        const lowerText = text.toLowerCase();

        // 1. Detección de Navegación
        if (lowerText.includes('ir a') || lowerText.includes('ver') || lowerText.includes('muéstrame')) {
            if (lowerText.includes('carta') || lowerText.includes('inicio')) return { type: 'NAVIGATE', section: 'home' };
            if (lowerText.includes('carrito') || lowerText.includes('pedido')) return { type: 'NAVIGATE', section: 'cart' };
            if (lowerText.includes('cuenta') || lowerText.includes('pagar')) return { type: 'NAVIGATE', section: 'cuenta' };
            if (lowerText.includes('cocina') || lowerText.includes('kds')) return { type: 'NAVIGATE', section: 'kds' };

            // Intentar detectar categorías (esto podría mejorarse con Fuse de categorías también)
            if (lowerText.includes('postre')) return { type: 'NAVIGATE', section: 'postres' };
            if (lowerText.includes('bebida')) return { type: 'NAVIGATE', section: 'bebidas' };
            if (lowerText.includes('comida') || lowerText.includes('entrante')) return { type: 'NAVIGATE', section: 'comidas' };
        }

        // 2. Detección de "Cuenta/Pagar" directa
        if (lowerText.includes('la cuenta') || lowerText.includes('cobrar') || lowerText.includes('cuanto es')) {
            return { type: 'BILL', action: 'view' };
        }

        // 3. Detección de Pedido (Añadir al carrito)
        // Palabras clave: quiero, ponme, dame, añadir, uno de...
        const orderKeywords = ['quiero', 'ponme', 'dame', 'añadir', 'pido', 'tomaré', 'una', 'un', 'dos'];
        const isOrder = orderKeywords.some(keyword => lowerText.includes(keyword));

        if (isOrder || this.menuItems.length > 0) { // Si no es comando de nav, asumimos que puede ser un pedido
            // Intentamos buscar qué plato se menciona
            // Eliminamos palabras comunes para limpiar la búsqueda
            const cleanText = lowerText
                .replace(/quiero|ponme|dame|añadir|por favor|un|una|dos|tres|el|la|los|las|de/g, '')
                .trim();

            if (cleanText.length > 2) {
                const results = this.fuse.search(cleanText);

                if (results.length > 0) {
                    const bestMatch = results[0].item;
                    // Detección rudimentaria de cantidad (mejorar con librería nlp si se quiere más precisión)
                    let quantity = 1;
                    if (lowerText.includes('dos') || lowerText.includes('2 ')) quantity = 2;
                    if (lowerText.includes('tres') || lowerText.includes('3 ')) quantity = 3;
                    if (lowerText.includes('cuatro') || lowerText.includes('4 ')) quantity = 4;

                    return {
                        type: 'ADD_TO_CART',
                        item: bestMatch,
                        quantity
                    };
                }
            }
        }

        return { type: 'UNKNOWN', text };
    }
}
