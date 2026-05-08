-- =============================================
-- LEAD MANAGEMENT — Extends property_inquiries
-- Creates configurable lead_sources table
-- =============================================

-- 1. New columns on property_inquiries
ALTER TABLE public.property_inquiries 
  ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'otro'
    CHECK (lead_type IN ('propiedad_especifica','comprar','vender','alquiler','otro'));

ALTER TABLE public.property_inquiries
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

ALTER TABLE public.property_inquiries
  ADD COLUMN IF NOT EXISTS lead_language TEXT DEFAULT 'es'
    CHECK (lead_language IN ('es', 'en', 'other'));

CREATE INDEX IF NOT EXISTS idx_inquiries_type ON public.property_inquiries(lead_type);
CREATE INDEX IF NOT EXISTS idx_inquiries_source ON public.property_inquiries(source);

-- 2. Configurable lead sources table
CREATE TABLE IF NOT EXISTS public.lead_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label_es TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT DEFAULT '📋',
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.lead_sources (name, label_es, label_en, icon, sort_order) VALUES
  ('whatsapp_oficina','WhatsApp Oficina','Office WhatsApp','💬',1),
  ('llamada_celular','Llamada celular','Cell Phone Call','📱',2),
  ('guardia_fisica','Guardia fisica','Physical Guard','🛡',3),
  ('referido_broker','Referido del broker','Broker Referral','🤝',4),
  ('facebook_ig','Facebook/IG Oficina','Office Facebook/IG','📘',5),
  ('mkt_oficina','MKT Oficina','Office Marketing','📣',6),
  ('walk_in','Walk in','Walk In','🚶',7),
  ('remax_cr','REMAX Costa Rica','REMAX Costa Rica','🔵',8),
  ('remax_cca','REMAX CCA','REMAX CCA','🔵',9),
  ('remax_intl','REMAX International','REMAX International','🌐',10),
  ('correo_oficina','Correo Oficina','Office Email','📧',11),
  ('realtor_com','Realtor.com','Realtor.com','🏠',12),
  ('crcasas','crCasas','crCasas','🏡',13),
  ('anuntico','Anuntico','Anuntico','📰',14),
  ('expat','Expat / ARCR','Expat / ARCR','✈',15),
  ('yourhomecr','YourHomeCR','YourHomeCR','🏘',16),
  ('buscocasita','BuscoCasita','BuscoCasita','🔍',17),
  ('bienesonline','BienesOnline','BienesOnline','💻',18),
  ('4321property','4321 Property','4321 Property','🔢',19),
  ('mls','MLS','MLS','📊',20),
  ('terra_cr','Terra CR','Terra CR','🌎',21),
  ('propiedades_cr','Propiedades CR','Propiedades CR','📋',22),
  ('development_page','Pagina de Desarrollo','Development Page','🏗',23),
  ('otra','Otra','Other','➕',99)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lead sources" ON public.lead_sources 
  FOR SELECT USING (true);

CREATE POLICY "Brokers manage lead sources" ON public.lead_sources 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );
