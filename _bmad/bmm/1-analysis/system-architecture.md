# Architectura Next.js - ALTITUD HUB (BMad Method)

## Overview
El proyecto "ALTITUD HUB" ha sido migrado de Vanilla HTML a Next.js (App Router) bajo los principios de BMad Method.

## Tecnologías Clave
- **Next.js 15+** (App Router: `src/app`)
- **React Server Components**
- **Tailwind CSS 3/4** (Estilos globales configurados en `globals.css` integrando tokens de REMAX)
- **Supabase** (Autenticación y Base de Datos ubicada en `src/lib/supabase.js`)

## Estructura BMB 
La estructura sigue las arquitecturas BMB (BMad Builder):
1. `src/app/`: Rutas base (`page.jsx`, `layout.jsx`, `prelisting/page.jsx`).
2. `src/components/layout/`: Componentes universales (`Sidebar.jsx`, `TopNav.jsx`).
3. `src/lib/`: Utilidades agnósticas (Configuración Supabase).

## Próximos Flujos (Workflows)
1. Conectar formularios de UI (`prelisting`) con la tabla `pre_listings` en Supabase.
2. Dinamizar tabla de "ACM" con el Rol del Agente autenticado.
