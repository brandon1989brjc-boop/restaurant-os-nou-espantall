'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ActionBar, { TabType } from '@/components/menu/ActionBar';
import CategorySidebar from '@/components/menu/CategorySidebar';
import { useNativeVoice } from '@/components/voice/useNativeVoice';
import { useElevenLabsVoice } from '@/components/voice/useElevenLabsVoice';
import VoiceDebugPanel from '@/components/debug/VoiceDebugPanel';
import DynamicScroller from '@/components/menu/DynamicScroller';
import CartDrawer from '@/components/menu/CartDrawer';
import ReviewsSection from '@/components/menu/ReviewsSection';
import ModificationConfirmation from '@/components/menu/ModificationConfirmation';
import ProductDetailsModal from '@/components/menu/ProductDetailsModal';
import VoiceFallbackModal from '@/components/voice/VoiceFallbackModal';
import { useVapi } from '@/components/voice/useVapi';
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
  const [reviewContext, setReviewContext] = useState<{ id?: string, name?: string }>({});
  const [modificationToShow, setModificationToShow] = useState<{
    dishName: string;
    modifications: DishModification[];
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<LocalizedMenuItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { categories, restaurant, language, setLanguage, featuredDish } = useMenu();
  const addItem = useOrderStore((state) => state.addItem);
  const updateBilling = useOrderStore((state) => state.updateBilling);
  const router = useRouter();

  // Hoisted Handlers
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'comidas') setActiveCategoryId('entrantes');
    if (tab !== 'reseñas') setReviewContext({});
  }, []);

  const handleItemClick = useCallback((item: LocalizedMenuItem, user?: string) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item);
      setIsDetailsOpen(true);
    } else {
      addItem(item, user);
    }
  }, [addItem]);

  const allDishes = useMemo(() => {
    const dishesFromCategories = categories.flatMap(cat =>
      cat.items.map(item => ({ ...item, category: cat.name }))
    );
    if (featuredDish) {
      return [...dishesFromCategories, { ...featuredDish, category: featuredDish.category || 'Especialidad' }];
    }
    return dishesFromCategories;
  }, [categories, featuredDish]);

  const handleItemFound = useCallback((item: any) => {
    let dish = { ...item };
    if (item.id && !item.name) {
      const found = allDishes.find(d => d.id === item.id);
      if (found) dish = { ...found, ...item };
    }

    if (dish && dish.id) {
      const comensal = item.comensal || undefined;

      if (item.modifications && item.modifications.length > 0) {
        const modsArray = item.modifications.map((m: any) => m.toString());
        addItem({ ...dish, modifiers: modsArray } as any, comensal);

        setModificationToShow({
          dishName: dish.name || 'Plato',
          modifications: item.modifications.map((m: any) => ({
            type: m.toString().startsWith('Sin') ? 'remove' : 'add',
            ingredient: m.toString().replace(/^(Sin |Con |Con extra de )/, '')
          }))
        });
        setIsCartOpen(true);
      } else {
        handleItemClick(dish as any, comensal);
      }
    }
  }, [allDishes, addItem, handleItemClick]);

  // Integration Hooks
  const {
    status: elStatus,
    toggleSession: toggleElSession,
    isSpeaking: isElSpeaking,
    isConnecting: isElConnecting
  } = useElevenLabsVoice({
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'TU_AGENT_ID',
    onNavigate: (section) => {
      if (section === 'cart') setIsCartOpen(true);
      else if (section === 'home') {
        handleTabChange('comidas');
        setIsCartOpen(false);
      }
      else if (section === 'cuenta') handleTabChange('cuenta');
      else {
        const exists = categories.some(cat => cat.id === section);
        if (exists) {
          handleTabChange('comidas');
          setActiveCategoryId(section);
          setIsCartOpen(false);
        }
      }
    }
  });

  const [fallbackContext, setFallbackContext] = useState<{ isOpen: boolean, options: LocalizedMenuItem[], message?: string }>({
    isOpen: false,
    options: []
  });

  const {
    isListening, isProcessing, isSpeaking, toggleListening,
    logs, apiStatus, clearLogs, forceReconnect, shouldKeepListening,
    analyser
  } = useNativeVoice({
    onNavigate: (section) => {
      if (section === 'cart') setIsCartOpen(true);
      else if (section === 'home') {
        handleTabChange('comidas');
        setIsCartOpen(false);
      }
      else if (section === 'cuenta') handleTabChange('cuenta');
      else {
        const exists = categories.some(cat => cat.id === section);
        if (exists) {
          handleTabChange('comidas');
          setActiveCategoryId(section);
          setIsCartOpen(false);
        }
      }
    },
    onItemFound: handleItemFound,
    onClarify: (options, message) => {
      // Mapear IDs de ítems a objetos reales del menú
      const resolvedOptions = options.map(opt => {
        if (typeof opt === 'string') return allDishes.find(d => d.id === opt);
        if (opt.item_id) return allDishes.find(d => d.id === opt.item_id);
        return opt;
      }).filter(Boolean) as LocalizedMenuItem[];

      setFallbackContext({ isOpen: true, options: resolvedOptions, message });
    }
  });

  const {
    isCalling: isVapiCalling,
    isSpeaking: isVapiSpeaking,
    toggleCall: toggleVapiCall,
    volume: vapiVolume
  } = useVapi({
    onNavigate: (section) => {
      if (section === 'cart' || section === 'carrito') setIsCartOpen(true);
      else if (section === 'home' || section === 'inicio') {
        handleTabChange('comidas');
        setIsCartOpen(false);
      }
      else if (section === 'cuenta') handleTabChange('cuenta');
      else {
        const exists = categories.some(cat => cat.id === section);
        if (exists) {
          handleTabChange('comidas');
          setActiveCategoryId(section);
          setIsCartOpen(false);
        }
      }
    },
    onItemFound: handleItemFound,
    onCartClear: () => useOrderStore.getState().clearCart()
  });

  const isVozActiva = elStatus === 'connected' || isListening || shouldKeepListening || isVapiCalling;
  const handleToggleVoz = () => {
    const client = process.env.NEXT_PUBLIC_VOICE_CLIENT || 'native';
    if (client === 'elevenlabs') {
      toggleElSession();
    } else if (client === 'vapi') {
      toggleVapiCall();
    } else {
      toggleListening();
    }
  };

  useEffect(() => {
    // Exponer el store globalmente para que vAPI pueda consultar totales localmente
    if (typeof window !== 'undefined') {
      (window as any).useOrderStore = useOrderStore;
    }
  }, []);

  const filteredDishes = useMemo(() => {
    const activeCat = categories.find(cat => cat.id === activeCategoryId);
    if (activeCat) {
      return activeCat.items.map(item => ({ ...item, category: activeCat.name }));
    }
    return [];
  }, [activeCategoryId, categories]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'comidas' && (
          <>
            <CategorySidebar
              categories={categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
              activeCategoryId={activeCategoryId}
              onCategoryClick={setActiveCategoryId}
            />
            <div className="flex-1 relative">
              <DynamicScroller
                dishes={filteredDishes}
                onItemClick={handleItemClick}
                onOpenReviews={(dish) => setReviewContext({ id: dish.id, name: dish.name })}
              />
            </div>
          </>
        )}

        {activeTab === 'reseñas' && <ReviewsSection dishId={reviewContext.id} dishName={reviewContext.name} />}
        {activeTab === 'cuenta' && <BillSection />}
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {modificationToShow && (
        <ModificationConfirmation
          dishName={modificationToShow.dishName}
          modifications={modificationToShow.modifications}
          onClose={() => setModificationToShow(null)}
        />
      )}

      <ProductDetailsModal
        item={selectedItem}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onAddToCart={(i, q, m) => {
          addItem({ ...i, quantity: q, modifiers: m.length > 0 ? m : undefined });
          setIsDetailsOpen(false);
          setIsCartOpen(true);
        }}
      />

      <VoiceFallbackModal
        isOpen={fallbackContext.isOpen}
        options={fallbackContext.options}
        message={fallbackContext.message}
        onClose={() => setFallbackContext(prev => ({ ...prev, isOpen: false }))}
        onSelect={(item) => {
          handleItemClick(item);
          setFallbackContext(prev => ({ ...prev, isOpen: false }));
        }}
      />

      <ActionBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenCart={() => setIsCartOpen(true)}
        voiceState={{
          isListening: isVozActiva,
          isProcessing: isElConnecting || isProcessing,
          isSpeaking: isElSpeaking || isSpeaking || isVapiSpeaking,
          toggleListening: handleToggleVoz,
          analyser
        }}
      />

      <VoiceDebugPanel
        logs={logs}
        onClearLogs={clearLogs}
        apiStatus={apiStatus}
        onForceReconnect={forceReconnect}
        isListening={isListening}
      />
    </main>
  );
}
