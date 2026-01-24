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
        <aside className="lg:fixed lg:top-0 lg:right-0 lg:h-full lg:w-80 bg-white border-b lg:border-l border-gray-100 z-40 flex flex-col w-full lg:w-auto overflow-hidden">
            <div className="p-4 lg:p-8 h-full flex flex-col">
                <div className="mb-4 lg:mb-10 lg:block hidden">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Categorías</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Explora nuestra selección</p>
                </div>

                <nav className="flex-1 overflow-x-auto lg:overflow-y-auto custom-scrollbar lg:pr-2 pb-2 lg:pb-0">
                    <ul className="flex lg:flex-col space-x-3 lg:space-x-0 lg:space-y-3 whitespace-nowrap lg:whitespace-normal">
                        {categories.map((cat) => (
                            <li key={cat.id} className="inline-block lg:block">
                                <button
                                    onClick={() => onCategoryClick(cat.id)}
                                    className={`flex items-center gap-3 lg:gap-5 px-4 lg:px-6 py-2.5 lg:py-4 rounded-xl lg:rounded-2xl transition-all duration-300 group min-w-max lg:w-full ${activeCategoryId === cat.id
                                        ? 'bg-gray-900 text-white shadow-lg lg:shadow-xl shadow-gray-200 scale-100 lg:scale-105'
                                        : 'text-gray-500 bg-gray-50 lg:bg-transparent hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <span className={`text-xl lg:text-2xl transition-transform duration-500 ${activeCategoryId === cat.id ? 'rotate-12 scale-110' : 'group-hover:scale-110'}`}>
                                        {cat.icon}
                                    </span>
                                    <div className="text-left">
                                        <span className="block font-bold text-xs lg:text-sm leading-none">{cat.name}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest opacity-50 transition-all ${activeCategoryId === cat.id ? 'block' : 'hidden lg:group-hover:block'}`}>
                                            {activeCategoryId === cat.id ? 'Explorando' : 'Ver más'}
                                        </span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="mt-8 pt-8 border-t border-gray-100 lg:block hidden">
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
