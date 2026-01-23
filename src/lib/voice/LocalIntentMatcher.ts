// Motor de Intents Local - Optimizado para Español Coloquial
// Zero-latency, Zero-cost, 100% Reliable

interface MenuItem {
    id: string;
    name: string;
    keywords?: string[];
    category: string;
}

interface Intent {
    action: 'navigate' | 'add_to_cart' | 'unknown';
    section?: string;
    item_id?: string;
    quantity?: number;
    confidence: number;
}

export class LocalIntentMatcher {
    private menuItems: MenuItem[];

    constructor(menuItems: MenuItem[]) {
        this.menuItems = menuItems;
    }

    match(text: string): Intent {
        const normalized = this.normalize(text);

        // 1. NAVEGACIÓN (Prioridad Alta)
        const navIntent = this.matchNavigation(normalized);
        if (navIntent.confidence > 0.8) return navIntent;

        // 2. AÑADIR AL CARRITO
        const cartIntent = this.matchAddToCart(normalized);
        if (cartIntent.confidence > 0.6) return cartIntent;

        return { action: 'unknown', confidence: 0 };
    }

    private normalize(text: string): string {
        return text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos de verdad
            .replace(/ñ/g, 'n')
            .trim();
    }

    private matchNavigation(text: string): Intent {
        const patterns = {
            cuenta: /\b(cuenta|pagar|cobrar|dolorosa|factura|ticket|cuanto es|qué debo)\b/,
            cart: /\b(carrito|pedido|ver (el )?pedido|mi pedido|que he pedido|revisar pedido)\b/,
            home: /\b(inicio|volver|atras|menu principal|carta|ver todo|la carta)\b/,
            entrantes: /\b(ver )?(entrantes|entradas|aperitivos|tapas|para empezar|picar)\b/,
            bocadillos: /\b(ver )?(bocadillos|bocatas|sandwiches|entrepans|burgers|hamburguesas)\b/,
            bebidas: /\b(ver )?(bebidas|beber|refrescos|copas|liquidos|sed)\b/,
            para_compartir: /\b(ver )?(compartir|raciones|platos al centro|centro)\b/,
            torradas: /\b(ver )?(torradas|tostadas|pan con algo)\b/
        };

        for (const [section, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                return { action: 'navigate', section, confidence: 0.95 };
            }
        }

        return { action: 'unknown', confidence: 0 };
    }

    private matchAddToCart(text: string): Intent {
        const quantity = this.extractQuantity(text);

        const synonyms: { [key: string]: string[] } = {
            'h_esp': ['espantall', 'hamburguesa de la casa', 'hamburguesa completa', 'especialidad'],
            'h_esp_item': ['espantall', 'hamburguesa de la casa', 'hamburguesa completa', 'especialidad'],
            'c_cal_and': ['calamares', 'andaluza', 'chipirones', 'rebozados'],
            'c_mej': ['mejillones', 'clochinas'],
            'c_huevos': ['huevos rotos', 'huevos con jamon', 'patatas con huevo'],
            'b_lomo': ['lomo', 'bocadillo de lomo'],
            'to_cat': ['catalana', 'torrada catalana', 'longaniza'],
            'to_brie': ['brie', 'pollo con brie'],
            'e_cabra': ['cabra', 'ensalada de cabra'],
            'p_crema': ['crema catalana', 'postre de la casa'],
            'p_coulant': ['coulant', 'chocolate', 'volcan']
        };

        for (const item of this.menuItems) {
            const itemName = this.normalize(item.name);

            // 1. Match Directo
            if (text.includes(itemName)) {
                return { action: 'add_to_cart', item_id: item.id, quantity, confidence: 0.98 };
            }

            // 2. Match por Sinónimos
            const itemSynonyms = synonyms[item.id] || [];
            for (const syn of itemSynonyms) {
                if (text.includes(this.normalize(syn))) {
                    return { action: 'add_to_cart', item_id: item.id, quantity, confidence: 0.9 };
                }
            }
        }

        // 3. Fuzzy Match
        for (const item of this.menuItems) {
            const itemName = this.normalize(item.name);
            if (this.fuzzyMatch(text, itemName) > 0.8) {
                return { action: 'add_to_cart', item_id: item.id, quantity, confidence: 0.8 };
            }
        }

        // 4. Match por Categoría + Verbo
        const orderPatterns = [/\b(quiero|dame|ponme|trae|traeme|añadir|pedir|marchando)\b/];
        if (orderPatterns.some(p => p.test(text))) {
            const categoryMatch = this.matchByCategory(text);
            if (categoryMatch) return categoryMatch;
        }

        return { action: 'unknown', confidence: 0 };
    }

    private extractQuantity(text: string): number {
        const numbers: { [key: string]: number } = {
            'un': 1, 'una': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
            'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
        };
        for (const [word, num] of Object.entries(numbers)) {
            if (text.includes(word)) return num;
        }
        const digitMatch = text.match(/\b(\d+)\b/);
        return digitMatch ? parseInt(digitMatch[1]) : 1;
    }

    private similarity(s1: string, s2: string): number {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1.0;
        return (longer.length - this.levenshtein(longer, shorter)) / longer.length;
    }

    private fuzzyMatch(text: string, target: string): number {
        const words = text.split(' ');
        let bestScore = 0;
        for (const word of words) {
            const score = this.similarity(word, target);
            if (score > bestScore) bestScore = score;
        }
        return bestScore;
    }

    private levenshtein(s1: string, s2: string): number {
        const dp = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));
        for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
        for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                dp[i][j] = s1[i - 1] === s2[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
            }
        }
        return dp[s1.length][s2.length];
    }

    private matchByCategory(text: string): Intent | null {
        const cats = {
            'entrantes': ['ensalada', 'croqueta', 'picar'],
            'bocadillos': ['hamburguesa', 'burger', 'bocata', 'lomo'],
            'bebidas': ['cerveza', 'birra', 'vino', 'agua', 'coca', 'refresco']
        };
        for (const [category, keywords] of Object.entries(cats)) {
            for (const kw of keywords) {
                if (text.includes(kw)) {
                    const item = this.menuItems.find(i => this.normalize(i.category) === category);
                    if (item) return { action: 'add_to_cart', item_id: item.id, quantity: this.extractQuantity(text), confidence: 0.8 };
                }
            }
        }
        return null;
    }
}
