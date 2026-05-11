# Technical Handover - ALTITUD HUB

## Módulo de Búsquedas (Buyer Searches)
El módulo de "Búsqueda" implementado en `src/app/busqueda` permite el cruce de requerimientos de clientes (compradores) con las propiedades (`properties`) y pre-listings (`acm_reports`) de la oficina.

### [PREGUNTA PARA NICO] Integración de Búsquedas Orgánicas de la Web
**@Nico:** ¿Es viable integrar en este panel de búsquedas del HUB la información de lo que los usuarios están buscando orgánicamente en nuestra página web pública? 
Como no tenemos visibilidad de cómo está construida la web actualmente, necesitamos saber:
1. ¿En qué tecnología o CMS está construida la web pública actual?
2. ¿Existe alguna API, webhook o log de analíticas donde podamos extraer los términos de búsqueda, zonas consultadas o filtros usados por los usuarios?
3. La visión es canalizar esta "intención de demanda" hacia el HUB para que los agentes vean qué está buscando el mercado. ¿Qué tan complejo sería conectar esa data con Supabase?

### Pipeline de Propiedades Enviadas
Actualmente, el sistema registra el estado de una coincidencia ('enviada', 'interesado', 'rechazada') en la tabla `buyer_search_pipeline`. 

**Integración Futura (TINDER INMOBILIARIO):**
Este pipeline, además de servir al proceso interno, está pensado para alimentar y retroalimentarse del futuro "Tinder Inmobiliario" que vivirá en la página web pública:
- Las propiedades "enviadas" desde el HUB le llegarán al cliente a través de una interfaz web (Tinder Inmobiliario).
- El cliente (y eventualmente el público en general) podrá hacer "Swipe Right" (Me interesa) o "Swipe Left" (Descartar) en la página web.
- Esas interacciones actualizarán automáticamente el estado en la tabla `buyer_search_pipeline` (cambiando a 'interesado' o 'rechazada'), lo que se reflejará en tiempo real en este panel del HUB.

## Notificaciones
El sistema de notificaciones está construido sobre la tabla `notifications` y se visualiza en `TopNav.jsx`. 
- **Mejora Futura:** Considerar implementar WebSockets (Supabase Realtime) para que las notificaciones de nuevos "matches" lleguen sin necesidad de recargar la página, en conjunto con un trigger a nivel de base de datos (`AFTER INSERT ON properties`).
