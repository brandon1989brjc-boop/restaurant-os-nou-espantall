import Fuse from 'fuse.js';

export interface MenuItemMinimal {
    id: string;
    name: string;
    keywords?: string[];
}

export class MenuFuzzyMatcher {
    private fuse: Fuse<MenuItemMinimal>;

    constructor(items: MenuItemMinimal[]) {
        this.fuse = new Fuse(items, {
            keys: ['name', 'keywords'],
            threshold: 0.4, // Tolerancia a errores de pronunciación
            distance: 100,
            includeScore: true
        });
    }

    findBestMatch(text: string): MenuItemMinimal | null {
        const results = this.fuse.search(text);
        if (results.length > 0 && results[0].score! < 0.5) {
            return results[0].item;
        }
        return null;
    }
}
