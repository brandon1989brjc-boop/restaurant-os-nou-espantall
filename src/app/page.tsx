'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ActionBar, { TabType } from '@/components/menu/ActionBar';
import CategorySidebar from '@/components/menu/CategorySidebar';
import { useNativeVoice } from '@/components/voice/useNativeVoice';
import VoiceDebugPanel from '@/components/debug/VoiceDebugPanel';
import DynamicScroller from '@/components/menu/DynamicScroller';
import CartDrawer from '@/components/menu/CartDrawer';
import ReviewsSection from '@/components/menu/ReviewsSection';
import ModificationConfirmation from '@/components/menu/ModificationConfirmation';
import ProductDetailsModal from '@/components/menu/ProductDetailsModal';
import BillSection from '@/components/menu/BillSection';
import { useMenu } from '@/hooks/useMenu';
import { useOrderStore } from '@/stores/useOrderStore';
import { useRouter } from 'next/navigation';
import { VoiceEvent, DishModification } from '@/lib/voice/types';
import { LocalizedMenuItem } from '@/types/menu';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('comidas');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('entrantes');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [reviewContext, setReviewContext] = useState<{ id?: string, name?: string }>({});
  const [modificationToShow, setModificationToShow] = useState<{
    dishName: string;
    modifications: DishModification[];
  } | null>(null);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [activeDish, setActiveDish] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<LocalizedMenuItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { categories, restaurant, language, setLanguage, featuredDish } = useMenu();
  const addItem = useOrderStore((state) => state.addItem);
  const router = useRouter();

  // ➤ INTEGRACIÓN CEREBRO NATIVO
  const {
    isListening, isProcessing, isSpeaking, toggleListening,
    logs, apiStatus, clearLogs, forceReconnect, shouldKeepListening,
    analyser
  } = useNativeVoice({
    onNavigate: (section) => {
      // Normalizamos la navegación para reutilizar la lógica de handleVoiceEvent si quisiéramos,
      // pero aquí llamamos directo a los setters para rapidez.
      if (section === 'cart') setIsCartOpen(true);
      else if (section === 'home') {
        handleTabChange('comidas');
        setIsCartOpen(false);
      }
      else if (section === 'cuenta') handleTabChange('cuenta');
      else if (section === 'kds') router.push('/kds');
      else {
        // Navegación dinámica por categorías (entrantes, bocadillos, etc.)
        const exists = categories.some(cat => cat.id === section);
        if (exists) {
          handleTabChange('comidas');
          setActiveCategoryId(section);
          setIsCartOpen(false);
        }
      }
    },
    onItemFound: (item) => {
      let dish = { ...item };
      if (item.id && !item.name) {
        const found = allDishes.find(d => d.id === item.id);
        if (found) dish = { ...found, ...item };
      }

      if (dish) {
        // Si hay modificaciones detectadas por voz
        if (item.modifications && item.modifications.length > 0) {
          // Formatear para el store de pedidos
          const modsArray = item.modifications.map((m: string) => m.toString());

          // Añadir directamente al carrito con modificaciones
          addItem({
            ...dish,
            modifiers: modsArray
          } as any);

          // Mostrar confirmación visual (Toast)
          setModificationToShow({
            dishName: dish.name || 'Plato',
            modifications: item.modifications.map((m: string) => ({
              type: m.startsWith('Sin') ? 'remove' : 'add',
              ingredient: m.replace(/^(Sin |Con |Con extra de )/, '')
            }))
          });

          setIsCartOpen(true);
        } else {
          // Flujo normal sin modificaciones
          handleItemClick(dish as any);
        }
      }
    }
  });

  // Helper to find item regardless of current language by checking ID
  const allDishes = useMemo(() => {
    const dishesFromCategories = categories.flatMap(cat =>
      cat.items.map(item => ({
        ...item,
        category: cat.name
      }))
    );

    // Incluir plato destacado si existe
    if (featuredDish) {
      return [...dishesFromCategories, { ...featuredDish, category: featuredDish.category || 'Especialidad' }];
    }

    return dishesFromCategories;
  }, [categories, restaurant]);

  // Handle direct add or modal open
  const handleItemClick = (item: LocalizedMenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item);
      setIsDetailsOpen(true);
    } else {
      addItem(item); // Simple add
    }
  };

  const handleModalAddToCart = (item: LocalizedMenuItem, quantity: number, modifiers: string[]) => {
    addItem({
      ...item,
      quantity,
      modifiers: modifiers.length > 0 ? modifiers : undefined
    });
    setIsDetailsOpen(false);
    setIsCartOpen(true);
  };

  // Get categories list for sidebar
  const sidebarCategories = useMemo(() => categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon
  })), [categories]);

  // Get dishes filtered by active category
  // Get dishes filtered by active category
  const filteredDishes = useMemo(() => {
    const activeCat = categories.find(cat => cat.id === activeCategoryId);
    if (activeCat) {
      return activeCat.items.map(item => ({ ...item, category: activeCat.name }));
    }
    return [];
  }, [activeCategoryId, categories]);

  const updateBilling = useOrderStore((state) => state.updateBilling);



  const handleVoiceEvent = useCallback((event: VoiceEvent) => {
    console.log('Voice Event:', event);

    if (event.type === 'navigate_to_section') {
      const { section_name } = event.payload;

      if (section_name === 'cart') setIsCartOpen(true);
      if (section_name === 'home') {
        handleTabChange('comidas');
        setIsCartOpen(false);
      }
      if (section_name === 'kds') router.push('/kds');

      // Si es una categoría de comida
      const isCategory = categories.some(cat => cat.id === section_name);
      if (isCategory) {
        handleTabChange('comidas');
        setActiveCategoryId(section_name);
        setIsCartOpen(false);
      }

      if (section_name === 'reseñas') handleTabChange('reseñas');
      if (section_name === 'cuenta' || section_name === 'filtro') handleTabChange('cuenta');
    }

    if (event.type === 'update_order_cart') {
      const { action, items } = event.payload;
      if (action === 'add') {
        items.forEach(item => {
          const dishToAdd = allDishes.find(d =>
            d.name.toLowerCase().includes(item.item_name.toLowerCase()) ||
            d.id.toLowerCase() === item.item_name.toLowerCase()
          );

          if (dishToAdd) {
            // Convertir modificaciones estructuradas a strings
            const modifiersArray: string[] = [];
            if (item.modifications && item.modifications.length > 0) {
              item.modifications.forEach(mod => {
                if (mod.type === 'remove' && mod.ingredient) {
                  modifiersArray.push(`Sin ${mod.ingredient}`);
                } else if (mod.type === 'add' && mod.ingredient) {
                  modifiersArray.push(`Con ${mod.ingredient} extra`);
                } else if (mod.type === 'preference' && mod.instruction) {
                  modifiersArray.push(mod.instruction);
                }
              });

              // Mostrar confirmación visual
              setModificationToShow({
                dishName: dishToAdd.name,
                modifications: item.modifications
              });
            }

            // Añadir notas simples si existen
            if (item.notes) {
              modifiersArray.push(item.notes);
            }

            addItem({
              ...dishToAdd,
              modifiers: modifiersArray.length > 0 ? modifiersArray : undefined,
            }, item.assigned_to);
          }
        });
        setIsCartOpen(true);
      }
    }

    if (event.type === 'modification_confirmation') {
      const { dish_name, modifications } = event.payload;
      setModificationToShow({
        dishName: dish_name,
        modifications
      });
    }

    if (event.type === 'manage_billing') {
      const { method, payer, payment_type } = event.payload;
      updateBilling({
        method,
        payer,
        paymentType: payment_type,
      });
      setIsCartOpen(true); // Mostrar el carrito/checkout
    }
    if (event.type === 'native_item_found') {
      // payload.item puede ser el objeto completo (si viene de local) o { id, quantity } (si viene de IA)
      const payloadItem = event.payload.item;
      let dish = payloadItem;

      // Si viene solo el ID (desde la API IA), buscamos el objeto completo
      if (payloadItem.id && !payloadItem.name) {
        dish = allDishes.find(d => d.id === payloadItem.id);
      }

      if (dish) {
        // Si viene cantidad, la inyectamos temporalmente para que addItem la use si fuera necesario,
        // aunque handleItemClick maneja la lógica de modales.
        // MEJORA: Pasamos quantity a handleModalAddToCart o addItem si pudiéramos, 
        // pero por ahora mantenemos el flujo estándar: Abrir modal o añadir.
        handleItemClick(dish);
      }
    }
  }, [allDishes, addItem, updateBilling, router, handleItemClick]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'comidas') setActiveCategoryId('entrantes');
    if (tab !== 'reseñas') setReviewContext({});
  };

  const openDishReviews = (dish: any) => {
    setReviewContext({ id: dish.id, name: dish.name });
    setActiveTab('reseñas');
  };

  const goToNextCategory = () => {
    const currentIndex = categories.findIndex(cat => cat.id === activeCategoryId);
    const nextIndex = (currentIndex + 1) % categories.length;
    const nextCat = categories[nextIndex];
    setActiveCategoryId(nextCat.id);
    setActiveTab('comidas');
  };

  const goToPrevCategory = () => {
    const currentIndex = categories.findIndex(cat => cat.id === activeCategoryId);
    const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
    const prevCat = categories[prevIndex];
    setActiveCategoryId(prevCat.id);
    setActiveTab('comidas');
  };

  return (
    <main className="min-h-screen bg-white transition-colors duration-500 overflow-hidden pr-80">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 mr-80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-gray-200">
              N
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-none">{restaurant.name}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black mt-1">Bar Cambrils • Ecosistema Digital</p>
            </div>
          </div>
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
          >
            {language}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="pt-24 pb-32">
        {activeTab === 'reseñas' ? (
          <div className="max-w-7xl mx-auto px-6 animate-in slide-in-from-bottom-8 duration-700">
            <ReviewsSection
              dishId={reviewContext.id}
              dishName={reviewContext.name}
            />
          </div>
        ) : activeTab === 'cuenta' ? (
          <BillSection />
        ) : (
          <div className="animate-in fade-in duration-1000">
            <DynamicScroller
              dishes={filteredDishes}
              isPaused={isPaused}
              speed={scrollSpeed}
              onActiveDishChange={setActiveDish}
              onOpenReviews={openDishReviews}
              onNextCategory={goToNextCategory}
              onPrevCategory={goToPrevCategory}
              onItemClick={handleItemClick}
            />
          </div>
        )}
      </div>

      {/* Side Components */}
      <CategorySidebar
        categories={sidebarCategories}
        activeCategoryId={activeCategoryId}
        onCategoryClick={(id) => {
          handleTabChange('comidas');
          setActiveCategoryId(id);
          setIsPaused(false);
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />



      {/* Modification Confirmation Toast */}
      {modificationToShow && (
        <ModificationConfirmation
          dishName={modificationToShow.dishName}
          modifications={modificationToShow.modifications}
          onClose={() => setModificationToShow(null)}
        />
      )}

      {/* Product Details Modal */}
      <ProductDetailsModal
        item={selectedItem}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onAddToCart={handleModalAddToCart}
      />



      {/* Bottom Action Bar */}
      <ActionBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenCart={() => setIsCartOpen(true)}
        voiceState={{ isListening: isListening || shouldKeepListening, isProcessing, isSpeaking, toggleListening, analyser }}
      />

      {/* Panel de Diagnóstico para Ingeniería */}
      <VoiceDebugPanel
        logs={logs}
        apiStatus={apiStatus}
        isListening={isListening || shouldKeepListening}
        onClearLogs={clearLogs}
        onForceReconnect={forceReconnect}
      />
    </main>
  );
}
