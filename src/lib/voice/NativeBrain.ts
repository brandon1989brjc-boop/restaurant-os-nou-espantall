import Fuse from 'fuse.js';
import { LocalizedMenuItem } from '@/types/menu';

// Tipos de acciones
export type NativeIntent =
    | { type: 'NAVIGATE'; section: string }
    | { type: 'ADD_TO_CART'; item: LocalizedMenuItem; quantity: number }
    | { type: 'BILL'; action: 'view' | 'pay' }
    | { type: 'UNKNOWN'; text: string };

export class NativeBrain {
    private fuse: Fuse<LocalizedMenuItem>;

    constructor(menuItems: LocalizedMenuItem[]) {
        // Configuración ROBUSTA de Fuse
        // Prioridad absoluta al NOMBRE y KEYWORDS.
        this.fuse = new Fuse(menuItems, {
            keys: [
                { name: 'name', weight: 0.7 },      // El nombre es rey
                { name: 'keywords', weight: 0.3 },  // Las keywords ayudan
                // { name: 'description', weight: 0.1 } // Quitamos descripción por ahora para evitar falsos positivos
            ],
            threshold: 0.4, // 0.4 es bastante permisivo pero seguro
            ignoreLocation: true,
            minMatchCharLength: 3
        });
    }

    public process(text: string): NativeIntent {
        const originalText = text.toLowerCase();
        console.log(`🧠 CEREBRO PROCESANDO: "${originalText}"`);

        // 1. COMANDOS DE NAVEGACIÓN (Hardcoded por seguridad)
        if (this.isNavigation(originalText)) {
            return this.processNavigation(originalText);
        }

        // 2. DETECCIÓN DE INTENCIÓN DE PEDIDO
        // Lista de verbos "gatillo" que indican deseo de pedir
        const orderTriggers = ['quiero', 'dame', 'ponme', 'agrega', 'añade', 'pido', 'tráeme', 'llevar', 'voy a tomar', 'me pones'];
        const hasOrderIntent = orderTriggers.some(t => originalText.includes(t));

        // Limpieza quirúrgica: Quitamos SOLO los verbos y palabras de relleno conocidas
        let cleanText = originalText;

        // Eliminamos verbos de acción
        orderTriggers.forEach(trigger => {
            cleanText = cleanText.replace(trigger, '');
        });

        // Eliminamos palabras de enlace comunes (artículos, preposiciones)
        const fillerWords = [' un ', ' una ', ' uno ', ' dos ', ' tres ', ' el ', ' la ', ' los ', ' las ', ' de ', ' del ', ' al ', ' por ', ' favor ', ' para ', ' con ', ' y '];
        fillerWords.forEach(word => {
            cleanText = cleanText.replaceAll(word, ' '); // replaceAll para quitar todas las ocurrencias
        });

        cleanText = cleanText.trim();
        console.log(`🧹 TEXTO LIMPIO: "${cleanText}"`);

        // 3. BÚSQUEDA DEL PRODUCTO
        // Solo buscamos si nos queda algo de texto (ej. "hamburguesa")
        if (cleanText.length > 2) {
            const results = this.fuse.search(cleanText);

            if (results.length > 0) {
                const bestMatch = results[0].item;
                const score = results[0].score || 0;
                console.log(`🎯 MATCH ENCONTRADO: ${bestMatch.name} (Score: ${score})`);

                // Si el score es menor a 0.6 (cuanto menor, mejor coincidencia), confiamos.
                if (score < 0.6) {
                    const quantity = this.extractQuantity(originalText);
                    return {
                        type: 'ADD_TO_CART',
                        item: bestMatch,
                        quantity
                    };
                }
            } else {
                console.log("❌ NO SE ENCONTRARON COINCIDENCIAS");
            }
        }

        return { type: 'UNKNOWN', text };
    }

    private isNavigation(text: string): boolean {
        return text.includes('ir a') || text.includes('ver') || text.includes('muéstrame') || text.includes('abrir') || text.includes('cuenta') || text.includes('pagar');
    }

    private processNavigation(text: string): NativeIntent {
        if (text.includes('carta') || text.includes('inicio')) return { type: 'NAVIGATE', section: 'home' };
        if (text.includes('carrito') || text.includes('pedido')) return { type: 'NAVIGATE', section: 'cart' };
        if (text.includes('cuenta') || text.includes('pagar') || text.includes('cobrar')) return { type: 'NAVIGATE', section: 'cuenta' };
        if (text.includes('cocina') || text.includes('kds')) return { type: 'NAVIGATE', section: 'kds' };

        if (text.includes('bocadillo')) return { type: 'NAVIGATE', section: 'bocadillos' };
        if (text.includes('entrante')) return { type: 'NAVIGATE', section: 'entrantes' };

        return { type: 'UNKNOWN', text };
    }

    private extractQuantity(text: string): number {
        if (text.includes(' dos ') || text.includes(' 2 ') || text.includes('par de')) return 2;
        if (text.includes(' tres ') || text.includes(' 3 ')) return 3;
        if (text.includes(' cuatro ') || text.includes(' 4 ')) return 4;
        return 1;
    }
}
