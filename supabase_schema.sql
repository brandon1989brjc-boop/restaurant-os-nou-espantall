-- ============================================
-- RESTAURANT OS - SUPABASE SCHEMA
-- Arquitectura Híbrida: Client + Server
-- ADN BitTraffic: Medible, Escalable, ACID
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: orders
-- Pedidos principales por mesa
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  source VARCHAR(20) DEFAULT 'vapi' CHECK (source IN ('vapi', 'manual', 'qr', 'n8n')),
  notes TEXT,
  delivery_type VARCHAR(20) DEFAULT 'table',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices optimizados para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders(table_id, status) WHERE status != 'delivered';
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: order_items
-- Items individuales de cada pedido
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id VARCHAR(100) NOT NULL,
  dish_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0 AND quantity <= 50),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  diner_name VARCHAR(100) DEFAULT 'General',
  modifications JSONB DEFAULT '[]'::jsonb,
  category VARCHAR(50),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dish_id ON order_items(dish_id);
CREATE INDEX IF NOT EXISTS idx_order_items_diner ON order_items(diner_name);

-- ============================================
-- TABLA: analytics_events
-- Tracking de eventos para ROI y optimización
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  table_id VARCHAR(50),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para análisis temporal
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_table ON analytics_events(table_id);

-- ============================================
-- VISTA: order_summary
-- Vista materializada para dashboards
-- ============================================
CREATE OR REPLACE VIEW order_summary AS
SELECT 
  o.id,
  o.table_id,
  o.status,
  o.total,
  o.source,
  o.created_at,
  COUNT(oi.id) as total_items,
  ARRAY_AGG(DISTINCT oi.diner_name) as diners,
  ARRAY_AGG(
    jsonb_build_object(
      'dish_name', oi.dish_name,
      'quantity', oi.quantity,
      'diner', oi.diner_name
    )
  ) as items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.table_id, o.status, o.total, o.source, o.created_at;

-- ============================================
-- FUNCIÓN: calculate_order_total
-- Recalcula el total de un pedido basado en items
-- ============================================
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_amount DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(unit_price * quantity), 0.00)
  INTO total_amount
  FROM order_items
  WHERE order_id = order_uuid;
  
  RETURN total_amount;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar total automáticamente cuando se añaden items
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE orders 
    SET total = calculate_order_total(NEW.order_id)
    WHERE id = NEW.order_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE orders 
    SET total = calculate_order_total(OLD.order_id)
    WHERE id = OLD.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_total_on_items
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_order_total();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Seguridad básica - ajustar según necesidades
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer (ajustar en producción)
CREATE POLICY "Allow public read access on orders" 
  ON orders FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert access on orders" 
  ON orders FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update access on orders" 
  ON orders FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public read access on order_items" 
  ON order_items FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert access on order_items" 
  ON order_items FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public insert access on analytics_events" 
  ON analytics_events FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public read access on analytics_events" 
  ON analytics_events FOR SELECT 
  USING (true);

-- ============================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ============================================
-- Descomentar para testear

/*
INSERT INTO orders (table_id, total, source) VALUES 
  ('MESA-01', 45.50, 'vapi'),
  ('MESA-02', 89.90, 'manual');

INSERT INTO order_items (order_id, dish_id, dish_name, quantity, unit_price, diner_name, category) VALUES
  ((SELECT id FROM orders WHERE table_id = 'MESA-01' LIMIT 1), 'bravas', 'Patatas Bravas', 2, 12.50, 'Juan', 'entrantes'),
  ((SELECT id FROM orders WHERE table_id = 'MESA-01' LIMIT 1), 'croquetas', 'Croquetas de Jamón', 1, 20.50, 'María', 'entrantes');

INSERT INTO analytics_events (event_type, order_id, table_id, metadata) VALUES
  ('voice_order_start', (SELECT id FROM orders WHERE table_id = 'MESA-01' LIMIT 1), 'MESA-01', '{"voice_provider": "vapi"}'::jsonb),
  ('order_completed', (SELECT id FROM orders WHERE table_id = 'MESA-01' LIMIT 1), 'MESA-01', '{"completion_time_seconds": 45}'::jsonb);
*/

-- ============================================
-- QUERIES DE MANTENIMIENTO
-- ============================================

-- Ver pedidos activos por mesa
-- SELECT * FROM order_summary WHERE status IN ('pending', 'preparing') ORDER BY created_at DESC;

-- Analítica de órdenes por fuente
-- SELECT source, COUNT(*), AVG(total) as avg_total FROM orders GROUP BY source;

-- Eventos de analytics por tipo
-- SELECT event_type, COUNT(*), DATE_TRUNC('day', created_at) as day 
-- FROM analytics_events 
-- GROUP BY event_type, day 
-- ORDER BY day DESC;

-- ============================================
-- FIN DEL SCHEMA
-- ============================================
