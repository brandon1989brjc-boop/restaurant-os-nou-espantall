import { useLanguageStore } from '@/stores/useLanguageStore';
import rawMenuData from '@/lib/menu.json';
import { MenuItem, RestaurantData, LocalizedMenuItem } from '@/types/menu';

// Castear el JSON crudo a los tipos correctos
const menuData = rawMenuData as unknown as RestaurantData;

export const useMenu = () => {
    const { language, setLanguage } = useLanguageStore();

    const getLocalizedItem = (item: MenuItem): LocalizedMenuItem => ({
        ...item,
        originalName: item.name,
        name: item.name[language],
        description: item.description[language],
        modifierGroups: item.modifierGroups?.map(group => ({
            ...group,
            name: group.name[language],
            options: group.options.map(opt => ({
                ...opt,
                name: opt.name[language]
            }))
        })),
        keywords: item.keywords
    });

    const categories = menuData.categories.map(cat => ({
        ...cat,
        name: cat.name[language],
        items: cat.items.map(item => getLocalizedItem(item))
    }));

    const allDishes = categories.flatMap(cat => cat.items);
    const featuredDish = getLocalizedItem(menuData.featuredDish);

    return {
        categories,
        allDishes,
        featuredDish,
        restaurant: menuData.restaurant,
        reviews: menuData.reviews,
        language,
        setLanguage
    };
};
