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
    modifications?: string[];
    confidence: number;
}

export class LocalIntentMatcher {
    private menuItems: MenuItem[];

    // Pattern Refinado siguiendo el reporte (Named Capture Groups)
    private readonly PATRON_PEDIDO = /^(?:quiero|dame|ponme|agrega|anadir)\s+(?<cantidad>\d+|un|una|dos|tres)?\s*(?<producto>.+?)(?:\s+(?:con|sin)\s+(?<modificadores>.*))?$/i;

    constructor(menuItems: MenuItem[]) {
        this.menuItems = menuItems;
    }

    match(text: string): Intent {
        const normalized = this.normalize(text);

        // 1. NAVEGACIÓN (Prioridad Alta)
        const navIntent = this.matchNavigation(normalized);
        if (navIntent.confidence > 0.8) return navIntent;

        // 2. PARSING SEMÁNTICO (Regex Nombrado)
        const matchedGroups = this.PATRON_PEDIDO.exec(normalized);
        if (matchedGroups && matchedGroups.groups) {
            const { cantidad, producto, modificadores } = matchedGroups.groups;
            const quantity = this.normalizarCantidad(cantidad);
            const mods = this.extractModifications(text); // Extraer del original para preservar contexto

            // Buscar el producto con Jaro-Winkler (Superior para Menús)
            const bestMatch = this.findBestProductMatch(producto);

            if (bestMatch && bestMatch.score > 0.7) {
                return {
                    action: 'add_to_cart',
                    item_id: bestMatch.item.id,
                    quantity,
                    modifications: mods,
                    confidence: bestMatch.score
                };
            }
        }

        // 3. FALLBACK: AÑADIR AL CARRITO (Synonyms & Fuzzy)
        const cartIntent = this.matchAddToCart(normalized);
        if (cartIntent.confidence > 0.6) return cartIntent;

        return { action: 'unknown', confidence: 0 };
    }

    private normalize(text: string): string {
        return text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/ñ/g, 'n')
            .replace(/[,.]/g, '')
            .trim();
    }

    private normalizarCantidad(val?: string): number {
        if (!val) return 1;
        const mapa: { [key: string]: number } = { 'un': 1, 'una': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5 };
        if (mapa[val]) return mapa[val];
        const num = parseInt(val);
        return isNaN(num) ? 1 : num;
    }

    private findBestProductMatch(productText: string) {
        let bestItem = null;
        let maxScore = 0;

        for (const item of this.menuItems) {
            const name = this.normalize(item.name);
            const score = this.jaroWinkler(productText, name);
            if (score > maxScore) {
                maxScore = score;
                bestItem = item;
            }
        }
        return bestItem ? { item: bestItem, score: maxScore } : null;
    }

    // Algoritmo Jaro-Winkler propuesto en el informe
    private jaroWinkler(s1: string, s2: string): number {
        let m = 0;
        if (s1.length === 0 || s2.length === 0) return 0;
        if (s1 === s2) return 1;

        const range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
        const s1Matches = new Array(s1.length);
        const s2Matches = new Array(s2.length);

        for (let i = 0; i < s1.length; i++) {
            const start = Math.max(0, i - range);
            const end = Math.min(i + range + 1, s2.length);
            for (let j = start; j < end; j++) {
                if (s2Matches[j]) continue;
                if (s1[i] !== s2[j]) continue;
                s1Matches[i] = true;
                s2Matches[j] = true;
                m++;
                break;
            }
        }

        if (m === 0) return 0;

        let t = 0;
        let k = 0;
        for (let i = 0; i < s1.length; i++) {
            if (!s1Matches[i]) continue;
            while (!s2Matches[k]) k++;
            if (s1[i] !== s2[k]) t++;
            k++;
        }

        const jaro = (m / s1.length + m / s2.length + (m - t / 2) / m) / 3;

        // Ajuste de Winkler (prefijos comunes)
        let p = 0.1;
        let l = 0;
        while (s1[l] === s2[l] && l < 4) l++;

        return jaro + l * p * (1 - jaro);
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

    private extractModifications(text: string): string[] {
        const mods: string[] = [];
        const patterns = [
            { regex: /sin\s+(\w+)/gi, prefix: 'Sin ' },
            { regex: /con\s+(?:extra\s+de\s+)?(\w+)/gi, prefix: 'Con extra de ' },
            { regex: /poco\s+(\w+)/gi, prefix: 'Poco ' },
            { regex: /muy\s+(\w+)/gi, prefix: 'Muy ' },
        ];

        patterns.forEach(p => {
            let match;
            while ((match = p.regex.exec(text)) !== null) {
                if (match[1]) mods.push(`${p.prefix}${match[1]}`);
            }
        });

        if (text.includes('poco hecho')) mods.push('Poco hecho');
        if (text.includes('muy hecho')) mods.push('Muy hecho');
        if (text.includes('al punto')) mods.push('Al punto');

        return mods;
    }

    private matchAddToCart(text: string): Intent {
        const quantity = this.normalizarCantidad(text.split(' ')[0]);
        const modifications = this.extractModifications(text);

        for (const item of this.menuItems) {
            const itemName = this.normalize(item.name);
            if (text.includes(itemName)) {
                return { action: 'add_to_cart', item_id: item.id, quantity, modifications, confidence: 0.98 };
            }
        }

        return { action: 'unknown', confidence: 0 };
    }
}
