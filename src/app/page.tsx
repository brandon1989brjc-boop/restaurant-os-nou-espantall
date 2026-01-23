'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ActionBar, { TabType } from '@/components/menu/ActionBar';
import CategorySidebar from '@/components/menu/CategorySidebar';
import VoiceController from '@/components/menu/VoiceController';
import DynamicScroller from '@/components/menu/DynamicScroller';
import CartDrawer from '@/components/menu/CartDrawer';
import ReviewsSection from '@/components/menu/ReviewsSection';
import ModificationConfirmation from '@/components/menu/ModificationConfirmation';
import ProductDetailsModal from '@/components/menu/ProductDetailsModal';
import ElevenLabsWidgetIntegrated from '@/components/menu/ElevenLabsWidgetIntegrated';
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

  const { categories, restaurant, language, setLanguage } = useMenu();
  const addItem = useOrderStore((state) => state.addItem);
  const router = useRouter();

  // Helper to find item regardless of current language by checking ID
  // Note: allDishes will now contain localized strings.
  const allDishes = useMemo(() => categories.flatMap(cat =>
    cat.items.map(item => ({
      ...item,
      category: cat.name
    }))
  ), [categories]);

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

  // Escuchar eventos globales desde el Client Bridge (ElevenLabs Widget)
  useEffect(() => {
    const handleNavigate = (e: any) => {
      const section = e.detail;
      console.log('⚡ Evento recibido:', section);

      if (section === 'cart') setIsCartOpen(true);
      else if (section === 'home') {
        handleTabChange('comidas');
        setIsCartOpen(false);
      } else if (['bocadillos', 'entrantes', 'postres', 'bebidas', 'tablas', 'para_compartir', 'torradas', 'combinados', 'montaditos'].includes(section)) {
        handleTabChange('comidas');
        setActiveCategoryId(section);
        setIsCartOpen(false);
      }
    };

    window.addEventListener('ros:navigate', handleNavigate);
    return () => window.removeEventListener('ros:navigate', handleNavigate);
  }, []);

  // SISTEMA DE POLLING SYNC (El "cerebro" real)
  useEffect(() => {
    let lastProcessedTime = Date.now();
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync');
        const data = await res.json();

        if (data.command && data.timestamp > lastProcessedTime) {
          console.log('📬 Nuevo comando recibido:', data.command);
          lastProcessedTime = data.timestamp;
          const cmd = data.command;

          if (cmd.action === 'navigate') {
            // Disparar evento de navegación local
            window.dispatchEvent(new CustomEvent('ros:navigate', { detail: cmd.section }));
          } else if (cmd.action === 'add-to-cart') {
            // Logic to add to cart
            const dish = allDishes.find(d =>
              d.name.toLowerCase().includes(cmd.item.toLowerCase()) ||
              d.id.toLowerCase() === cmd.item.toLowerCase()
            );
            if (dish) {
              addItem(dish, 'Voz');
              setIsCartOpen(true);
            }
          }
        }
      } catch (e) {
        // Silently fail on network error
      }
    }, 1500); // Check every 1.5s

    return () => clearInterval(interval);
  }, [allDishes, addItem]);

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
      handleItemClick(event.payload.item);
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

      {/* Product Details Modal */}
      <ProductDetailsModal
        item={selectedItem}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onAddToCart={handleModalAddToCart}
      />

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
