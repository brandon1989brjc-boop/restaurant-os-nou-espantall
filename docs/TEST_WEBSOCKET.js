/**
 * Test Manual de WebSocket - Ejecutar en consola del navegador
 * 
 * Este script prueba si podemos conectarnos al WebSocket de ElevenLabs
 */

console.log('🧪 TEST DE WEBSOCKET ELEVENLABS\n');

// Configuración
const AGENT_ID = 'agent_5901kfkre4wwf2wr9reb6kj6de16';
const API_KEY = 'sk_e9500c98a695cb2be9ea18c14659b810259d3119f9cc9813';

// Intentar diferentes URLs según documentación de ElevenLabs
const possibleUrls = [
    `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`,
    `wss://api.elevenlabs.io/v1/text-to-speech/${AGENT_ID}/stream`,
    `wss://api.eleven labs.io/v1/websockets/${AGENT_ID}`
];

let attemptNumber = 0;

function tryNextUrl() {
    if (attemptNumber >= possibleUrls.length) {
        console.log('❌ Ninguna URL funcionó. Posibles causas:');
        console.log('1. ElevenLabs ConvAI WebSocket no es público sin configuración adicional');
        console.log('2. Se requiere autenticación específica en headers');
        console.log('3. El agente necesita estar publicado de una forma especial');
        console.log('\n💡 RECOMENDACIÓN: Usar el Widget oficial de ElevenLabs con listeners personalizados');
        return;
    }

    const url = possibleUrls[attemptNumber];
    console.log(`\n🔍 Probando URL ${attemptNumber + 1}/${possibleUrls.length}:`);
    console.log(`   ${url}`);

    const ws = new WebSocket(url);
    let connected = false;

    // Timeout de 5 segundos
    const timeout = setTimeout(() => {
        if (!connected) {
            console.log('   ⏱️ Timeout - Sin respuesta');
            ws.close();
            attemptNumber++;
            tryNextUrl();
        }
    }, 5000);

    ws.onopen = () => {
        connected = true;
        clearTimeout(timeout);
        console.log('   ✅ CONEXIÓN EXITOSA!');

        // Intentar autenticar
        console.log('   📤 Enviando autenticación...');
        ws.send(JSON.stringify({
            type: 'auth',
            xi- api - key: API_KEY,
            agent_id: AGENT_ID
        }));
};

ws.onmessage = (msg) => {
    console.log('   📨 Mensaje recibido:', typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data);
};

ws.onerror = (error) => {
    clearTimeout(timeout);
    console.log('   ❌ Error de conexión:', error);
    attemptNumber++;
    tryNextUrl();
};

ws.onclose = (event) => {
    clearTimeout(timeout);
    if (connected) {
        console.log('   🔴 Conexión cerrada:', event.code, event.reason || 'Sin razón');
    }
};
}

// Iniciar pruebas
tryNextUrl();
