export interface MultiLanguageString {
    es: string;
    en: string;
}

export interface ModifierOption {
    id: string;
    name: MultiLanguageString;
    priceDelta: number;
}

export interface ModifierGroup {
    id: string;
    name: MultiLanguageString;
    minSelection: number;
    maxSelection: number;
    options: ModifierOption[];
}

export interface MenuItem {
    id: string;
    name: MultiLanguageString;
    description: MultiLanguageString;
    price: number;
    category: string;
    rating: number;
    image: string;
    videoUrl?: string;
    modifierGroups?: ModifierGroup[];
}

export interface MenuCategory {
    id: string;
    name: MultiLanguageString;
    icon: string;
    items: MenuItem[];
}

export interface Review {
    id: string;
    userName: string;
    userAvatar: string;
    rating: number;
    comment: string;
    date: string;
    dishName: string;
}

export interface RestaurantData {
    restaurant: {
        name: string;
        chef: {
            name: string;
            specialty: string;
            rating: number;
            description: string;
            image: string;
        };
    };
    featuredDish: MenuItem;
    categories: MenuCategory[];
    reviews: Review[];
}

// Localized versions for UI components
export interface LocalizedModifierOption extends Omit<ModifierOption, 'name'> {
    name: string;
}

export interface LocalizedModifierGroup extends Omit<ModifierGroup, 'name' | 'options'> {
    name: string;
    options: LocalizedModifierOption[];
}

export interface LocalizedMenuItem extends Omit<MenuItem, 'name' | 'description' | 'modifierGroups'> {
    name: string;
    description: string;
    originalName: MultiLanguageString; // Keep track for matching
    modifierGroups?: LocalizedModifierGroup[];
}

export interface LocalizedMenuCategory extends Omit<MenuCategory, 'name' | 'items'> {
    name: string;
    items: LocalizedMenuItem[];
}
