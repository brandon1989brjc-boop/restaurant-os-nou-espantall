
const TEST_ORDER = {
    message: {
        toolCallList: [
            {
                id: "call_test_bit_traffic_v4",
                function: {
                    "name": "confirmar_pedido",
                    "arguments": JSON.stringify({
                        items: [
                            { id: "bravas", name: "Patatas Bravas", quantity: 1, price: 8.50 }
                        ],
                        nombre_cliente: "Juan Prueba",
                        mesa: "Mesa 10",
                        total: 8.50
                    })
                }
            }
        ]
    }
};

async function runTest() {
    console.log("🚀 Enviando prueba real a Vercel...");
    try {
        const response = await fetch("https://restaurant-os-wine.vercel.app/api/vapi/place-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(TEST_ORDER)
        });
        const result = await response.json();
        console.log("✅ Respuesta del servidor:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("❌ Error de red:", err.message);
    }
}

runTest();
