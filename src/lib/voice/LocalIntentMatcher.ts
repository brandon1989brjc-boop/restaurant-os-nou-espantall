// Motor de Intents Local - No requiere IA externa
// Usa matching fuzzy + keywords + patterns del español coloquial

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
    confidence: number; // 0-1
}

export class LocalIntentMatcher {
    private menuItems: MenuItem[];

    constructor(menuItems: MenuItem[]) {
        this.menuItems = menuItems;
    }

    // Función principal de matching
    match(text: string): Intent {
        const normalized = this.normalize(text);

        // 1. NAVEGACIÓN (alta prioridad)
        const navIntent = this.matchNavigation(normalized);
        if (navIntent.confidence > 0.7) return navIntent;

        // 2. AÑADIR AL CARRITO
        const cartIntent = this.matchAddToCart(normalized);
        if (cartIntent.confidence > 0.6) return cartIntent;

        // 3. Si nada funciona
        return { action: 'unknown', confidence: 0 };
    }

    private normalize(text: string): string {
        return text.toLowerCase()
            .replace(/á/g, 'a').replace(/é/g, 'e')
            .replace(/í/g, 'i').replace(/ó/g, 'o')
            .replace(/ú/g, 'u').replace(/ñ/g, 'n')
            .trim();
    }

    private matchNavigation(text: string): Intent {
        const patterns = {
            cuenta: /\b(cuenta|pagar|cobrar|dolorosa|factura|ticket)\b/,
            cart: /\b(carrito|pedido|ver (el )?pedido|mi pedido)\b/,
            home: /\b(inicio|volver|atras|menu principal|carta)\b/,
            entrantes: /\b(ver )?(entrantes|entradas|aperitivos|tapas)\b/,
            bocadillos: /\b(ver )?(bocadillos|bocatas|sandwiches)\b/,
            bebidas: /\b(ver )?(bebidas|beber|refrescos|copas)\b/
        };

        for (const [section, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                return {
                    action: 'navigate',
                    section,
                    confidence: 0.9
                };
            }
        }

        return { action: 'unknown', confidence: 0 };
    }

    private matchAddToCart(text: string): Intent {
        // Extraer cantidad
        const quantity = this.extractQuantity(text);

        // Buscar por nombre directo
        for (const item of this.menuItems) {
            const itemName = this.normalize(item.name);

            // Match exacto del nombre
            if (text.includes(itemName)) {
                return {
                    action: 'add_to_cart',
                    item_id: item.id,
                    quantity,
                    confidence: 0.95
                };
            }

            // Match por keywords
            if (item.keywords) {
                for (const keyword of item.keywords) {
                    if (text.includes(this.normalize(keyword))) {
                        return {
                            action: 'add_to_cart',
                            item_id: item.id,
                            quantity,
                            confidence: 0.85
                        };
                    }
                }
            }

            // Fuzzy match (tolerancia a errores de voz)
            if (this.fuzzyMatch(text, itemName) > 0.7) {
                return {
                    action: 'add_to_cart',
                    item_id: item.id,
                    quantity,
                    confidence: 0.75
                };
            }
        }

        // Patrones genéricos de "pedir algo"
        const orderPatterns = [
            /\b(quiero|dame|ponme|trae|traeme)\b/,
            /\b(pedir|añadir|agregar)\b/
        ];

        const isOrderIntent = orderPatterns.some(p => p.test(text));

        if (isOrderIntent) {
            // Intentar match por categoría + palabra clave
            const categoryMatch = this.matchByCategory(text);
            if (categoryMatch) return categoryMatch;
        }

        return { action: 'unknown', confidence: 0 };
    }

    private extractQuantity(text: string): number {
        const numbers: { [key: string]: number } = {
            'un': 1, 'una': 1, 'uno': 1,
            'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
            'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
        };

        for (const [word, num] of Object.entries(numbers)) {
            if (text.includes(word)) return num;
        }

        // Buscar dígitos
        const digitMatch = text.match(/\b(\d+)\b/);
        if (digitMatch) return parseInt(digitMatch[1]);

        return 1; // Default
    }

    private fuzzyMatch(text: string, target: string): number {
        // Levenshtein distance simplificado
        const words = text.split(' ');
        let bestScore = 0;

        for (const word of words) {
            const score = this.similarity(word, target);
            if (score > bestScore) bestScore = score;
        }

        return bestScore;
    }

    private similarity(s1: string, s2: string): number {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) return 1.0;

        const editDistance = this.levenshtein(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    private levenshtein(s1: string, s2: string): number {
        const dp: number[][] = Array(s1.length + 1).fill(null).map(() =>
            Array(s2.length + 1).fill(0)
        );

        for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
        for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j - 1] + 1
                    );
                }
            }
        }

        return dp[s1.length][s2.length];
    }

    private matchByCategory(text: string): Intent | null {
        const categoryKeywords = {
            'entrantes': ['pescado', 'frito', 'pescadito', 'ensalada', 'croqueta'],
            'bocadillos': ['bocadillo', 'bocata', 'hamburguesa', 'burger'],
            'bebidas': ['cerveza', 'birra', 'caña', 'vino', 'agua', 'refresco', 'coca']
        };

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    // Buscar el primer item de esa categoría que matchee
                    const item = this.menuItems.find(i =>
                        this.normalize(i.category) === category
                    );
                    if (item) {
                        return {
                            action: 'add_to_cart',
                            item_id: item.id,
                            quantity: this.extractQuantity(text),
                            confidence: 0.7
                        };
                    }
                }
            }
        }

        return null;
    }
}
