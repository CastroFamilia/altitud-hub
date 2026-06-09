# Product Brief — Olympia + Panel de Propiedades

**Project**: ALTITUD HUB  
**BMad Phase**: 1-Analysis → Product Brief (CB)  
**Date**: 2026-04-27  
**Author**: Alejandra Castro / Olympia Team  

---

## 1. Problem Statement

Los agentes de REMAX Altitud actualmente no tienen visibilidad centralizada sobre sus propiedades activas dentro del Hub. La información de listings vive en el portal REMAX CCA pero no está integrada con las herramientas internas (OKR, ACM, Pre-listing). Tampoco existe una herramienta inteligente que ayude a los agentes a analizar sus propiedades, mejorar sus descripciones o recibir coaching personalizado.

---

## 2. Product Vision

Construir dos módulos interconectados dentro de Altitud Hub:

### 🏠 **Panel de Propiedades ("Mi Portafolio")**
Un dashboard inteligente que muestra al agente todas sus propiedades activas (obtenidas de la API REMAX CCA), con herramientas de análisis, filtrado y gestión visual.

### 🏛️ **Olympia — IA Asistente**
Una IA conversacional integrada al Hub que:
- Responde preguntas del negocio con contexto personalizado
- Analiza propiedades específicas del portafolio del agente
- Genera textos de publicación (descripciones, posts, social media)
- Da consejos proactivos basados en la actividad OKR y el plan de negocio
- Trackea **temas y dudas** (no conversaciones) para informar capacitaciones

---

## 3. Target Users

| Persona | Necesidad |
|---------|-----------|
| **Agente** | Ver mis propiedades, obtener análisis inteligente, generar textos de marketing, recibir coaching |
| **Team Leader** | Visibilidad del portafolio de su equipo, entender necesidades de capacitación |
| **Broker** | Reportes mensuales de mindset/actividad por agente, temas de capacitación detectados |

---

## 4. Core Features (MVP)

### 4.1 Panel de Propiedades

#### 4.1.1 Mi Portafolio
- Grid/lista de propiedades del agente (fetch de REMAX CCA API filtrado por `agent_id`)
- Card de propiedad: imagen principal, título, precio, tipo, status, zona
- Filtros: tipo de propiedad, rango de precio, status
- Stats header: total propiedades, valor total de inventario, tiempo promedio en mercado

#### 4.1.2 Vista de Propiedad Individual
- Galería de imágenes
- Detalles completos (m², habitaciones, amenidades)
- Mapa de ubicación
- **Botón "Analizar con Olympia"** — abre Olympia con contexto de esa propiedad
- **Botón "Generar Publicación"** — abre Olympia en modo de publicaciones
- ACMs relacionados (si existen en Supabase para esa zona/tipo)

#### 4.1.3 Vista Broker/Team Leader
- Portafolio consolidado de todos los agentes o del equipo
- Filtro por agente
- Stats agregados de la oficina

### 4.2 Olympia Chat

#### 4.2.1 Modos de Olympia
- **💬 Coach**: Preguntas de negocio, motivación, estrategia
- **📝 Publicaciones**: Genera descripciones, posts sociales, captions
- **📊 Analizar Propiedad**: Toma los datos de una propiedad y da insights de pricing, posicionamiento, marketing

#### 4.2.2 Contexto Automático
Olympia construye su contexto con:
- `profiles` → nombre, rol, equipo, oficina
- `business_plans` → para qué, gastos, metas, gestión semanal
- `okr_daily_logs` → racha, cumplimiento, embudo de actividad
- `acm_reports` → ACMs realizados
- REMAX CCA API → propiedades activas del agente
- Google Calendar → eventos del día (Fase 2)

#### 4.2.3 Tracking de Temas (NO conversaciones)
- Cada interacción registra: temas discutidos, preguntas clave, mood indicator
- Tabla `olympia_activity_summaries` (1 registro por agente por día)
- Tabla `olympia_training_topics` (temas agregados mensuales → detecta oportunidades de capacitación)

#### 4.2.4 Reportes Mensuales para Brokers
- Generados automáticamente el 1ro de cada mes
- Enviados por email (pendiente definir proveedor, no Brevo)
- También visibles en el Panel de Oficina
- Contenido: actividad OKR, uso de Olympia, temas/dudas frecuentes, mood trend

---

## 5. Data Sources

| Source | Data | Access |
|--------|------|--------|
| REMAX CCA API | Propiedades activas, datos de agentes | `api.remax-cca.com/api/PropertiesPerOffice/{officeId}` |
| Supabase `profiles` | Perfil del agente, rol, equipo | Row Level Security |
| Supabase `business_plans` | Plan de negocio del agente | By agent_email |
| Supabase `okr_daily_logs` | Actividad diaria OKR | By profile_id |
| Supabase `acm_reports` | ACMs del agente | By user_id |
| Google Calendar API | Eventos del agente | Service Account + Domain-Wide Delegation (Fase 2) |
| Gemini 2.5 Flash | Motor IA | API key existente |

---

## 6. Technical Approach

### Architecture
- **Frontend**: React components dentro de Next.js App Router
- **AI Engine**: Google Gemini 2.5 Flash via `@google/genai` (SDK nuevo)
- **Streaming**: `generateContentStream` → `ReadableStream` en API route
- **Properties API**: Proxy via Next.js API route (reutilizar patrón de `ACM-REMAX/api/properties.js`)
- **Database**: Supabase con RLS (tablas nuevas para Olympia tracking)

### Key API Routes
```
/api/properties          → Proxy REMAX CCA properties feed
/api/olympia/chat        → Chat with streaming + context injection
/api/olympia/context     → Build agent context from Supabase
/api/olympia/reports     → Generate monthly reports (Cron)
```

---

## 7. Non-Functional Requirements

- **Performance**: Chat streaming nativamente (no esperar respuesta completa)
- **Privacy**: No almacenar conversaciones completas. Solo summaries y temas
- **Security**: API routes protegidas por auth. Olympia solo accede a datos del agente autenticado
- **Bilingual**: UI en ES/EN siguiendo el patrón existente de `context.js`
- **Theme-aware**: Dark/Light mode usando las clases existentes de Tailwind
- **Mobile-first**: Chat responsive, panel de propiedades con grid adaptativo

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Adopción de Olympia | 70% de agentes usan el chat al menos 1x/semana |
| Satisfacción | Feedback positivo en 3 meses |
| Capacitación | 1 capacitación mensual generada desde temas de Olympia |
| Uso de Portafolio | Agentes revisan sus propiedades semanalmente |

---

## 9. Phasing

| Fase | Contenido | Dependencias |
|------|-----------|-------------|
| **1** | Panel de Propiedades + Olympia Chat (Coach + Publicaciones + Análisis) | API key Gemini (ya existe) |
| **2** | Google Calendar integration + Briefing Matutino | Google Cloud Service Account |
| **3** | Reportes mensuales por email + Vista Broker | Decidir proveedor de email |

---

## 10. Open Items

- [ ] Definir proveedor de email para reportes mensuales (si no Brevo, ¿Resend? ¿SendGrid? ¿Gmail API directa?)
- [ ] Confirmar si broker quiere reportes individuales por agente o un reporte consolidado
- [ ] Definir si el portafolio muestra solo propiedades activas o también vendidas/históricas
- [ ] ¿Los team leaders tendrán acceso a Olympia con contexto de su equipo?
