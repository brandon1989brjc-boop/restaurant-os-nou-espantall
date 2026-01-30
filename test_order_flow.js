/**
 * TEST SCRIPT: Simulate professional order flow
 * 
 * This script demonstrates how VAPI or n8n would interact with the new API
 */

const TEST_ORDER = {
    table_id: "MESA-01",
    source: "vapi",
    items: [
        {
            dish_id: "bravas",
            quantity: 2,
            diner_name: "Juan",
            modifications: ["Sin picante"]
        },
        {
            dish_id: "croquetas",
            quantity: 1,
            diner_name: "María"
        }
    ]
};

async function testPlaceOrder() {
    console.log("🚀 Starting simulation: Placing professional order...");

    try {
        const response = await fetch("http://localhost:3000/api/orders/place", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-session-id": "test-session-123"
            },
            body: JSON.stringify(TEST_ORDER)
        });

        const result = await response.json();

        if (result.success) {
            console.log("✅ Order placed successfully!");
            console.log("Order ID:", result.order_id);
            console.log("Total:", result.total, "€");
            console.log("Response Time:", result.response_time_ms, "ms");
        } else {
            console.error("❌ Error placing order:", result.error);
            if (result.details) console.table(result.details);
        }
    } catch (error) {
        console.error("❌ Connection error:", error.message);
    }
}

// Para ejecutarlo desde la consola del navegador:
// copy-paste el código y llama a testPlaceOrder();
