import Fuse from 'fuse.js';

export interface MenuItemMinimal {
    id: string;
    name: string;
    keywords?: string[];
    category?: string;
}

export class MenuFuzzyMatcher {
    private fuse: Fuse<MenuItemMinimal>;
    private synonyms: Record<string, string> = {
        'coca': 'coca-cola',
        'cola': 'coca-cola',
        'coke': 'coca-cola',
        'fanta': 'fanta-limon',
        'limon': 'fanta-limon',
        'cerveza': 'estrella-galicia',
        'birra': 'estrella-galicia',
        'caña': 'estrella-galicia',
        'brava': 'patatas-bravas',
        'papas': 'patatas-bravas'
    };

    constructor(items: MenuItemMinimal[]) {
        this.fuse = new Fuse(items, {
            keys: [
                { name: 'name', weight: 0.7 },
                { name: 'keywords', weight: 0.3 }
            ],
            threshold: 0.35, // Umbral estricto para evitar falsos positivos
            distance: 100,
            includeScore: true,
            useExtendedSearch: true
        });
    }

    findBestMatch(text: string): MenuItemMinimal | null {
        const normalizedText = text.toLowerCase().trim();

        // 1. Check for synonyms
        for (const [key, value] of Object.entries(this.synonyms)) {
            if (normalizedText.includes(key)) {
                const results = this.fuse.search(value);
                if (results.length > 0) return results[0].item;
            }
        }

        // 2. Fuzzy search
        const results = this.fuse.search(normalizedText);
        if (results.length > 0 && results[0].score! < 0.4) {
            return results[0].item;
        }

        return null;
    }
}
