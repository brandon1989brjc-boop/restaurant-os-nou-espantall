import Fuse from 'fuse.js';
import { LocalizedMenuItem } from '@/types/menu';

// Implementación Nativa de Stopwords (Zero Dependencies)
const STOPWORDS_ES = new Set([
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'son', 'entre', 'está', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus', 'ellas', 'nosotras', 'vosotros', 'vosotras', 'os', 'mío', 'mía', 'míos', 'mías', 'tuyo', 'tuya', 'tuyos', 'tuyas', 'suyo', 'suya', 'suyos', 'suyas', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'es', 'soy', 'eres', 'somos', 'sois', 'estoy', 'estás', 'estamos', 'estáis', 'están', 'como', 'cómo', 'hacer', 'se', 'tengo', 'quiero', 'quisiera', 'ponme', 'dame', 'traeme', 'por', 'favor', 'gracias', 'hola', 'buenas', 'buenos', 'dias', 'noches', 'tardes'
]);

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
        // Configuración AVANZADA de Fuse
        this.fuse = new Fuse(menuItems, {
            // Peso: name > keywords > description
            keys: [
                { name: 'name', weight: 0.5 },
                { name: 'keywords', weight: 0.4 }, // ¡Novedad: Buscamos en etiquetas ocultas!
                { name: 'description', weight: 0.1 }
            ],
            threshold: 0.45, // Equilibrio entre estricto y flexible
            distance: 200, // Permitir coincidencias aunque la palabra esté lejos en la frase
            ignoreLocation: true // Buscar en cualquier parte del string
        });
    }

    public process(text: string): NativeIntent {
        const lowerText = text.toLowerCase();

        // 1. Detección de Navegación (Prioridad Alta)
        if (this.isNavigationCommand(lowerText)) {
            return this.processNavigation(lowerText);
        }

        // 2. Detección de "Cuenta/Pagar"
        if (lowerText.includes('la cuenta') || lowerText.includes('cobrar') || lowerText.includes('cuanto es')) {
            return { type: 'BILL', action: 'view' };
        }

        // 3. Procesamiento NLP para Pedidos
        // Limpiamos la frase de relleno: "hola quisiera por favor una burger" -> "burger"
        const words = lowerText.split(' ');
        const cleanWords = words.filter(w => !STOPWORDS_ES.has(w));
        const cleanText = cleanWords.join(' ');

        console.log(`🧠 NLP Debug: "${text}" -> Clean: "${cleanText}"`);

        if (cleanText.length > 2) {
            const results = this.fuse.search(cleanText);

            if (results.length > 0) {
                // Tomamos el mejor resultado
                const bestMatch = results[0].item;

                // Detección de cantidad mejorada
                const quantity = this.extractQuantity(lowerText);

                // Umbral de confianza: Si la coincidencia es muy mala (score alto en fuse), dudar.
                // Fuse devuelve score: 0 = perfecto, 1 = nada.
                if (results[0].score && results[0].score < 0.6) {
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

    private isNavigationCommand(text: string): boolean {
        return text.includes('ir a') || text.includes('ver') || text.includes('muéstrame') || text.includes('abrir');
    }

    private processNavigation(text: string): NativeIntent {
        if (text.includes('carta') || text.includes('inicio')) return { type: 'NAVIGATE', section: 'home' };
        if (text.includes('carrito') || text.includes('pedido')) return { type: 'NAVIGATE', section: 'cart' };
        if (text.includes('cuenta') || text.includes('pagar')) return { type: 'NAVIGATE', section: 'cuenta' };
        if (text.includes('cocina') || text.includes('kds')) return { type: 'NAVIGATE', section: 'kds' };

        // Categorías inteligentes
        if (text.includes('postre') || text.includes('dulce')) return { type: 'NAVIGATE', section: 'postres' };
        if (text.includes('bebida') || text.includes('sed')) return { type: 'NAVIGATE', section: 'bebidas' };
        if (text.includes('entrante') || text.includes('picoteo')) return { type: 'NAVIGATE', section: 'entrantes' };

        return { type: 'UNKNOWN', text };
    }

    private extractQuantity(text: string): number {
        if (text.includes('dos') || text.includes(' 2 ') || text.includes('un par')) return 2;
        if (text.includes('tres') || text.includes(' 3 ')) return 3;
        if (text.includes('cuatro') || text.includes(' 4 ')) return 4;
        if (text.includes('cinco') || text.includes(' 5 ')) return 5;
        if (text.includes('media docena')) return 6;
        return 1; // Default
    }
}
