import requests
import time
import json
from datetime import datetime

# CONFIGURACIÓN
# Cambia esto por tu URL de Vercel cuando despliegues
API_URL = "https://restaurant-os-wine.vercel.app/api/sync"

def monitor_commands():
    print(f"🚀 Iniciando Monitor de Comandos de Voz (Python Bridge)")
    print(f"📡 Conectado a: {API_URL}")
    print("-" * 50)
    
    last_processed_time = 0
    
    try:
        while True:
            try:
                response = requests.get(API_URL, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    command = data.get("command")
                    timestamp = data.get("timestamp", 0)
                    
                    if command and timestamp > last_processed_time:
                        last_processed_time = timestamp
                        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 🗣️  NUEVA ORDEN RECIBIDA:")
                        print(json.dumps(command, indent=2))
                        
                        if command.get('action') == 'navigate':
                            print(f"👉 Acción: Navegar a sección '{command.get('section')}'")
                        elif command.get('action') == 'add-to-cart':
                            print(f"🛒 Acción: Añadir {command.get('quantity')}x {command.get('item')}")
                            
                    # Feedback visual de "latido" cada 10 iteraciones
                    # print(".", end="", flush=True)
                
            except Exception as e:
                print(f"⚠️ Error de conexión: {e}")
                
            time.sleep(1.5)
            
    except KeyboardInterrupt:
        print("\n👋 Monitor detenido.")

if __name__ == "__main__":
    monitor_commands()
