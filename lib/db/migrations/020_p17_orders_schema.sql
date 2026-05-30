-- P17-3: Order domain schema (STAGING only until approved for PRODUCTION)
-- Spec: docs/architecture/P17-2-order-domain-spec.md

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  buyer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE RESTRICT,
  fulfillment_mode TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  subtotal_amount NUMERIC(12, 2) NOT NULL,
  shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  idempotency_key TEXT NULL,
  issue_flag BOOLEAN NOT NULL DEFAULT false,
  sla_deadline_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1,
  confirmed_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check CHECK (
    status IN (
      'draft',
      'pending_confirmation',
      'confirmed',
      'preparing',
      'shipped',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'buyer_confirmed',
      'completed',
      'cancelled'
    )
  ),
  CONSTRAINT orders_fulfillment_mode_check CHECK (
    fulfillment_mode IN ('shipping', 'pickup')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique ON orders (order_number);
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_buyer_user_id_created_at_idx
  ON orders (buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_user_id_status_created_at_idx
  ON orders (seller_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_ad_id_idx ON orders (ad_id);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  image_url TEXT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition_label TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT NULL,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  event_code TEXT NOT NULL,
  public_message_ar TEXT NULL,
  internal_note TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_status_history_from_status_check CHECK (
    from_status IS NULL OR from_status IN (
      'draft',
      'pending_confirmation',
      'confirmed',
      'preparing',
      'shipped',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'buyer_confirmed',
      'completed',
      'cancelled'
    )
  ),
  CONSTRAINT order_status_history_to_status_check CHECK (
    to_status IN (
      'draft',
      'pending_confirmation',
      'confirmed',
      'preparing',
      'shipped',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'buyer_confirmed',
      'completed',
      'cancelled'
    )
  ),
  CONSTRAINT order_status_history_actor_type_check CHECK (
    actor_type IN ('buyer', 'seller', 'system', 'admin')
  )
);

CREATE INDEX IF NOT EXISTS order_status_history_order_id_created_at_idx
  ON order_status_history (order_id, created_at);

CREATE TABLE IF NOT EXISTS buyer_addresses (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  label TEXT NULL,
  city TEXT NOT NULL,
  country_code TEXT NOT NULL,
  postal_code TEXT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT NULL,
  recipient_name TEXT NULL,
  phone TEXT NULL,
  source_address_id INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS buyer_addresses_order_id_unique
  ON buyer_addresses (order_id);

CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier_code TEXT NULL,
  carrier_label TEXT NULL,
  tracking_number TEXT NULL,
  shipped_at TIMESTAMPTZ NULL,
  estimated_delivery_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shipments_order_id_unique ON shipments (order_id);

CREATE TABLE IF NOT EXISTS shipment_events (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  description_ar TEXT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'seller_manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shipment_events_event_code_check CHECK (
    event_code IN ('picked_up', 'in_transit', 'out_for_delivery', 'delivered')
  ),
  CONSTRAINT shipment_events_source_check CHECK (
    source IN ('seller_manual', 'system', 'carrier_webhook')
  )
);

CREATE INDEX IF NOT EXISTS shipment_events_shipment_id_occurred_at_idx
  ON shipment_events (shipment_id, occurred_at);

CREATE TABLE IF NOT EXISTS order_issues (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT NULL,
  opened_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_admin_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  resolution_code TEXT NULL,
  resolved_at TIMESTAMPTZ NULL,
  freezes_auto_complete BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_issues_category_check CHECK (
    category IN (
      'not_received',
      'not_as_described',
      'damaged',
      'shipping_problem',
      'other'
    )
  ),
  CONSTRAINT order_issues_status_check CHECK (
    status IN ('open', 'under_review', 'resolved', 'closed')
  )
);

CREATE INDEX IF NOT EXISTS order_issues_order_id_idx ON order_issues (order_id);
CREATE INDEX IF NOT EXISTS order_issues_status_idx ON order_issues (status);
