/**
 * Analytics & Event Tracking Library
 * 
 * ADN BitTraffic: "Sin Dato no hay Relato"
 * 
 * Este módulo proporciona funciones para trackear eventos críticos
 * del negocio en Supabase para análisis de ROI.
 */

import { supabase, isMockMode } from './supabase';

/**
 * Tipos de eventos que trackeamos
 */
export enum AnalyticsEventType {
    // Voice Events
    VOICE_SESSION_START = 'voice_session_start',
    VOICE_SESSION_END = 'voice_session_end',
    VOICE_COMMAND_SUCCESS = 'voice_command_success',
    VOICE_COMMAND_ERROR = 'voice_command_error',

    // Order Events
    ORDER_PLACED = 'order_placed',
    ORDER_COMPLETED = 'order_completed',
    ORDER_CANCELLED = 'order_cancelled',

    // Cart Events
    ITEM_ADDED_TO_CART = 'item_added_to_cart',
    ITEM_REMOVED_FROM_CART = 'item_removed_from_cart',
    CART_CLEARED = 'cart_cleared',

    // Navigation Events
    PAGE_VIEW = 'page_view',
    SECTION_NAVIGATE = 'section_navigate',

    // Business Events
    PAYMENT_INITIATED = 'payment_initiated',
    PAYMENT_SUCCESS = 'payment_success',
    PAYMENT_FAILED = 'payment_failed',

    // Errors
    API_ERROR = 'api_error',
    CLIENT_ERROR = 'client_error',
}

/**
 * Metadata base para todos los eventos
 */
interface BaseEventMetadata {
    [key: string]: any;
}

/**
 * Estructura de un evento de analytics
 */
interface AnalyticsEvent {
    event_type: AnalyticsEventType | string;
    order_id?: string;
    session_id?: string;
    table_id?: string;
    user_agent?: string;
    metadata?: BaseEventMetadata;
}

/**
 * Obtener o crear session ID
 */
let cachedSessionId: string | null = null;

function getSessionId(): string {
    if (cachedSessionId) return cachedSessionId;

    // Intentar obtener de sessionStorage
    if (typeof window !== 'undefined') {
        try {
            const existing = sessionStorage.getItem('restaurant_session_id');
            if (existing) {
                cachedSessionId = existing;
                return existing;
            }

            // Crear nuevo session ID
            const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('restaurant_session_id', newSessionId);
            cachedSessionId = newSessionId;
            return newSessionId;
        } catch (e) {
            // Fallback si sessionStorage no está disponible
        }
    }

    // Fallback: generar ID temporal
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    cachedSessionId = tempId;
    return tempId;
}

/**
 * Obtener user agent
 */
function getUserAgent(): string | undefined {
    if (typeof window !== 'undefined' && window.navigator) {
        return window.navigator.userAgent;
    }
    return undefined;
}

/**
 * Función principal para trackear eventos
 * 
 * @param event - Configuración del evento a trackear
 * @returns Promise con el resultado del tracking
 * 
 * @example
 * ```ts
 * await trackEvent({
 *   event_type: AnalyticsEventType.ORDER_PLACED,
 *   order_id: 'abc-123',
 *   table_id: 'MESA-01',
 *   metadata: {
 *     total: 45.50,
 *     items_count: 3,
 *     source: 'voice'
 *   }
 * });
 * ```
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
    if (isMockMode) {
        console.log('📊 [MOCK] Analytics Event:', event.event_type, event.metadata);
        return;
    }

    try {
        const enrichedEvent = {
            ...event,
            session_id: event.session_id || getSessionId(),
            user_agent: event.user_agent || getUserAgent(),
            metadata: {
                ...(event.metadata || {}),
                timestamp: new Date().toISOString(),
                url: typeof window !== 'undefined' ? window.location.href : undefined,
            },
        };

        const { error } = await supabase
            .from('analytics_events')
            .insert([enrichedEvent]);

        if (error) {
            console.error('❌ Error tracking event:', error);
            // No lanzamos error para no romper el flujo de la app
        } else {
            console.log('📊 Event tracked:', event.event_type);
        }
    } catch (error) {
        console.error('❌ Exception tracking event:', error);
    }
}

/**
 * Track inicio de sesión de voz
 */
export async function trackVoiceSessionStart(metadata?: BaseEventMetadata) {
    return trackEvent({
        event_type: AnalyticsEventType.VOICE_SESSION_START,
        metadata: {
            ...metadata,
            provider: 'vapi',
        },
    });
}

/**
 * Track fin de sesión de voz
 */
export async function trackVoiceSessionEnd(metadata?: BaseEventMetadata) {
    return trackEvent({
        event_type: AnalyticsEventType.VOICE_SESSION_END,
        metadata,
    });
}

/**
 * Track pedido realizado
 */
export async function trackOrderPlaced(
    orderId: string,
    tableId: string,
    metadata?: BaseEventMetadata
) {
    return trackEvent({
        event_type: AnalyticsEventType.ORDER_PLACED,
        order_id: orderId,
        table_id: tableId,
        metadata,
    });
}

/**
 * Track item añadido al carrito
 */
export async function trackItemAdded(
    dishId: string,
    dishName: string,
    metadata?: BaseEventMetadata
) {
    return trackEvent({
        event_type: AnalyticsEventType.ITEM_ADDED_TO_CART,
        metadata: {
            dish_id: dishId,
            dish_name: dishName,
            ...metadata,
        },
    });
}

/**
 * Track navegación entre secciones
 */
export async function trackNavigation(section: string, metadata?: BaseEventMetadata) {
    return trackEvent({
        event_type: AnalyticsEventType.SECTION_NAVIGATE,
        metadata: {
            section,
            ...metadata,
        },
    });
}

/**
 * Track errores de API
 */
export async function trackApiError(
    endpoint: string,
    errorMessage: string,
    metadata?: BaseEventMetadata
) {
    return trackEvent({
        event_type: AnalyticsEventType.API_ERROR,
        metadata: {
            endpoint,
            error_message: errorMessage,
            ...metadata,
        },
    });
}

/**
 * Track errores del cliente
 */
export async function trackClientError(
    errorMessage: string,
    stack?: string,
    metadata?: BaseEventMetadata
) {
    return trackEvent({
        event_type: AnalyticsEventType.CLIENT_ERROR,
        metadata: {
            error_message: errorMessage,
            stack,
            ...metadata,
        },
    });
}

/**
 * Hook de React para tracking automático de page views
 */
export function usePageTracking(pageName: string) {
    if (typeof window === 'undefined') return;

    // Track on mount
    React.useEffect(() => {
        trackEvent({
            event_type: AnalyticsEventType.PAGE_VIEW,
            metadata: {
                page: pageName,
                referrer: document.referrer,
            },
        });
    }, [pageName]);
}

// React import para el hook
import React from 'react';

/**
 * Obtener estadísticas básicas de analytics
 * (para dashboards internos)
 */
export async function getAnalyticsStats(
    startDate?: Date,
    endDate?: Date
): Promise<any> {
    if (isMockMode) {
        return {
            total_events: 0,
            total_orders: 0,
            voice_sessions: 0,
        };
    }

    try {
        let query = supabase
            .from('analytics_events')
            .select('event_type, created_at', { count: 'exact' });

        if (startDate) {
            query = query.gte('created_at', startDate.toISOString());
        }
        if (endDate) {
            query = query.lte('created_at', endDate.toISOString());
        }

        const { data, count, error } = await query;

        if (error) throw error;

        // Procesar stats básicas
        const stats = {
            total_events: count || 0,
            total_orders: data?.filter(e => e.event_type === AnalyticsEventType.ORDER_PLACED).length || 0,
            voice_sessions: data?.filter(e => e.event_type === AnalyticsEventType.VOICE_SESSION_START).length || 0,
        };

        return stats;
    } catch (error) {
        console.error('Error fetching analytics stats:', error);
        return null;
    }
}
