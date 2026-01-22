'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ActionBar, { TabType } from '@/components/menu/ActionBar';
import CategorySidebar from '@/components/menu/CategorySidebar';
import VoiceController from '@/components/menu/VoiceController';
import DynamicScroller from '@/components/menu/DynamicScroller';
import CartDrawer from '@/components/menu/CartDrawer';
import ReviewsSection from '@/components/menu/ReviewsSection';
import ModificationConfirmation from '@/components/menu/ModificationConfirmation';
import ElevenLabsWidgetIntegrated from '@/components/menu/ElevenLabsWidgetIntegrated';
import menuData from '@/lib/menu.json';
import { useOrderStore } from '@/stores/useOrderStore';
import { useRouter } from 'next/navigation';
import { VoiceEvent, DishModification } from '@/lib/voice/types';

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

  const addItem = useOrderStore((state) => state.addItem);
  const router = useRouter();

  // Flatten all dishes for general views
  const allDishes = useMemo(() => menuData.categories.flatMap(cat =>
    cat.items.map(item => ({
      ...item,
      category: cat.name
    }))
  ), []);

  // Get categories list for sidebar
  const sidebarCategories = useMemo(() => menuData.categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon
  })), []);

  // Get dishes filtered by active category
  const filteredDishes = useMemo(() => {
    const activeCat = menuData.categories.find(cat => cat.id === activeCategoryId);
    if (activeCat) {
      return activeCat.items.map(item => ({ ...item, category: activeCat.name }));
    }
    return [];
  }, [activeCategoryId]);

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

      // Si es una categoría de comida (incluye postres, bebidas, etc.)
      const isCategory = menuData.categories.some(cat => cat.id === section_name);
      if (isCategory) {
        handleTabChange('comidas');
        setActiveCategoryId(section_name);
        setIsCartOpen(false);
      }

      if (section_name === 'reseñas') handleTabChange('reseñas');
      if (section_name === 'filtro') handleTabChange('filtro');
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
  }, [allDishes, addItem, updateBilling, router]);

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
    const currentIndex = menuData.categories.findIndex(cat => cat.id === activeCategoryId);
    const nextIndex = (currentIndex + 1) % menuData.categories.length;
    const nextCat = menuData.categories[nextIndex];
    setActiveCategoryId(nextCat.id);
    setActiveTab('comidas');
  };

  const goToPrevCategory = () => {
    const currentIndex = menuData.categories.findIndex(cat => cat.id === activeCategoryId);
    const prevIndex = (currentIndex - 1 + menuData.categories.length) % menuData.categories.length;
    const prevCat = menuData.categories[prevIndex];
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
              <h1 className="text-2xl font-black text-gray-900 leading-none">Nou Espantall</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black mt-1">Bar Cambrils • Ecosistema Digital</p>
            </div>
          </div>
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
        ) : activeTab === 'filtro' ? (
          <div className="h-[70vh] flex items-center justify-center text-center px-6 animate-in zoom-in duration-500">
            <div>
              <h2 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">Filtros Inteligentes</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest">Personaliza tu experiencia culinaria</p>
            </div>
          </div>
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

      <VoiceController
        onEvent={handleVoiceEvent}
      />

      {/* Modification Confirmation Toast */}
      {modificationToShow && (
        <ModificationConfirmation
          dishName={modificationToShow.dishName}
          modifications={modificationToShow.modifications}
          onClose={() => setModificationToShow(null)}
        />
      )}

      {/* ElevenLabs Widget with Integrated Actions */}
      {process.env.NEXT_PUBLIC_VOICE_CLIENT === 'widget' && (
        <ElevenLabsWidgetIntegrated
          agentId={process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'agent_5901kfkre4wwf2wr9reb6kj6de16'}
          onNavigate={(section) => {
            if (section === 'cart') setIsCartOpen(true);
            else if (['bocadillos', 'entrantes', 'postres', 'bebidas'].includes(section)) {
              handleTabChange('comidas');
              setActiveCategoryId(section);
            }
          }}
          onAddToCart={(item) => {
            const dish = allDishes.find(d => d.name.toLowerCase().includes(item.item_name.toLowerCase()));
            if (dish) {
              addItem(dish, item.assigned_to);
              setIsCartOpen(true);
            }
          }}
        />
      )}

      {/* Bottom Action Bar */}
      <ActionBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </main>
  );
}
