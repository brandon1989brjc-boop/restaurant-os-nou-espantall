'use client';

interface CategorySidebarProps {
    categories: { id: string; name: string; icon: string }[];
    activeCategoryId: string;
    onCategoryClick: (id: string) => void;
}

export default function CategorySidebar({
    categories,
    activeCategoryId,
    onCategoryClick,
}: CategorySidebarProps) {
    return (
        <aside className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-100 z-40 flex flex-col">
            <div className="p-8 h-full flex flex-col">
                <div className="mb-10">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Categorías</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Explora nuestra selección</p>
                </div>

                <nav className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <ul className="space-y-3">
                        {categories.map((cat) => (
                            <li key={cat.id}>
                                <button
                                    onClick={() => onCategoryClick(cat.id)}
                                    className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl transition-all duration-300 group ${activeCategoryId === cat.id
                                        ? 'bg-gray-900 text-white shadow-xl shadow-gray-200 scale-105'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <span className={`text-2xl transition-transform duration-500 ${activeCategoryId === cat.id ? 'rotate-12 scale-110' : 'group-hover:scale-110'}`}>
                                        {cat.icon}
                                    </span>
                                    <div className="text-left">
                                        <span className="block font-bold text-sm leading-none">{cat.name}</span>
                                        {activeCategoryId === cat.id && (
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Explorando</span>
                                        )}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                            Nou Espantall Bar © 2026
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
