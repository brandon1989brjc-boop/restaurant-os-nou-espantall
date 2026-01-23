import { VoiceEvent } from './types';
import { IVoiceClient, VoiceClientConfig } from './IVoiceClient';

/**
 * MockVoiceClientService
 * Simula el comportamiento del agente para pruebas de navegación y carrito
 * siguiendo estrictamente los tipos del sistema.
 */
export class MockVoiceClientService implements IVoiceClient {
    private config: VoiceClientConfig;
    private _isActive = false;

    constructor(config: VoiceClientConfig) {
        this.config = config;
    }

    isActive() { return this._isActive; }

    async start() {
        if (this._isActive) return;
        this._isActive = true;

        console.log('--- MOCK AGENT ACTIVATED ---');

        await new Promise(r => setTimeout(r, 800));
        this.config.onEvent({ type: 'agent_status', payload: { status: 'listening' } });

        // Simular mensaje de bienvenida
        setTimeout(() => {
            if (!this._isActive) return;
            this.simulateSpeaking("¡Hola! Soy el simulador de Nou Espantall. Voy a mostrarte los Postres.");
        }, 1500);

        // --- SIMULACIÓN 1: Navegar a Comidas ---
        setTimeout(() => {
            if (!this._isActive) return;
            console.log('Mock: Navegando a Comidas...');
            this.config.onEvent({
                type: 'navigate_to_section',
                payload: { section_name: 'comidas' }
            });
        }, 4000);

        // --- SIMULACIÓN 2: Añadir producto con modificación y asignación ---
        setTimeout(() => {
            if (!this._isActive) return;
            this.simulateSpeaking("Entendido María. Te añado una Burger sin cebolla a tu cuenta.");

            setTimeout(() => {
                if (!this._isActive) return;
                this.config.onEvent({
                    type: 'update_order_cart',
                    payload: {
                        action: 'add',
                        items: [{
                            item_name: 'Burger Nou Espantall',
                            quantity: 1,
                            notes: 'sin cebolla',
                            assigned_to: 'María'
                        }]
                    }
                });
            }, 2000);
        }, 8000);

        // --- SIMULACIÓN 3: Gestión de Pago por persona ---
        setTimeout(() => {
            if (!this._isActive) return;
            this.simulateSpeaking("Perfecto. He registrado que quieres pagar por separado.");

            setTimeout(() => {
                if (!this._isActive) return;
                this.config.onEvent({
                    type: 'manage_billing',
                    payload: {
                        method: 'individual',
                        payer: 'María',
                        payment_type: 'card'
                    }
                });
            }, 2000);
        }, 14000);
    }

    private simulateSpeaking(text: string) {
        if (!this._isActive) return;
        console.log(`Agent says: "${text}"`);
        this.config.onEvent({ type: 'agent_status', payload: { status: 'speaking' } });

        setTimeout(() => {
            if (this._isActive) {
                this.config.onEvent({ type: 'agent_status', payload: { status: 'listening' } });
            }
        }, 3000);
    }

    stop() {
        console.log('--- MOCK AGENT DEACTIVATED ---');
        this._isActive = false;
        this.config.onEvent({ type: 'agent_status', payload: { status: 'idle' } });
    }
}
