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
import BillSection from '@/components/menu/BillSection';
import { useMenu } from '@/hooks/useMenu';
import { useOrderStore } from '@/stores/useOrderStore';
import { useRouter } from 'next/navigation';
import { VoiceEvent, DishModification } from '@/lib/voice/types';
import { LocalizedMenuItem } from '@/types/menu';
import MenuHeader from '@/components/menu/MenuHeader';
import CategoryTabs from '@/components/menu/CategoryTabs';
import MenuGrid from '@/components/menu/MenuGrid';

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
  const [selectedItem, setSelectedItem] = useState<LocalizedMenuItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { categories, restaurant, language, setLanguage, featuredDish } = useMenu();
  const addItem = useOrderStore((state) => state.addItem);
  const updateBilling = useOrderStore((state) => state.updateBilling);
  const router = useRouter();

  // 1. Hoisted Handlers for Build-time Safety
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'comidas') setActiveCategoryId('entrantes');
    if (tab !== 'reseñas') setReviewContext({});
  }, []);

  const handleItemClick = useCallback((item: LocalizedMenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item);
      setIsDetailsOpen(true);
    } else {
      addItem(item);
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
      if (item.modifications && item.modifications.length > 0) {
        const modsArray = item.modifications.map((m: any) => m.toString());
        addItem({ ...dish, modifiers: modsArray } as any);

        setModificationToShow({
          dishName: dish.name || 'Plato',
          modifications: item.modifications.map((m: any) => ({
            type: m.toString().startsWith('Sin') ? 'remove' : 'add',
            ingredient: m.toString().replace(/^(Sin |Con |Con extra de )/, '')
          }))
        });
        setIsCartOpen(true);
      } else {
        handleItemClick(dish as any);
      }
    }
  }, [allDishes, addItem, handleItemClick]);

  // 2. Integration Hooks
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
    onItemFound: handleItemFound
  });

  const isVozActiva = elStatus === 'connected' || isListening || shouldKeepListening;
  const handleToggleVoz = () => {
    if (process.env.NEXT_PUBLIC_VOICE_CLIENT === 'elevenlabs') {
      toggleElSession();
    } else {
      toggleListening();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      <MenuHeader />

      <div className="flex-1 overflow-y-auto pb-32">
        {activeTab === 'comidas' && (
          <>
            <CategoryTabs activeCategory={activeCategoryId} onCategoryChange={setActiveCategoryId} />
            <div className="px-4 py-6">
              <MenuGrid categoryId={activeCategoryId} onItemClick={handleItemClick} />
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

      <ActionBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenCart={() => setIsCartOpen(true)}
        voiceState={{
          isListening: isVozActiva,
          isProcessing: isElConnecting || isProcessing,
          isSpeaking: isElSpeaking || isSpeaking,
          toggleListening: handleToggleVoz,
          analyser
        }}
      />

      <VoiceDebugPanel
        logs={logs}
        onClear={clearLogs}
        apiStatus={apiStatus}
        onReconnect={forceReconnect}
      />
    </main>
  );
}
