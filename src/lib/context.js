"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   FULL TRANSLATION DICTIONARY
   ═══════════════════════════════════════════════════════════════ */
const T = {
  es: {
    // Sidebar
    nav_principal: 'Principal',
    nav_crm: 'CRM & Leads',
    nav_soon: 'Pronto',
    nav_okr: 'Dashboard OKR',
    nav_plan: 'Mi Plan',
    nav_tools: 'Herramientas',
    nav_prelisting: 'Pre-Listing',
    nav_acm: 'Registro ACM',
    nav_magic: 'Magic Links',
    nav_search: 'Búsqueda',
    nav_portfolio: 'Portafolio',
    nav_properties: 'Mis Propiedades',
    agent_hq: 'Sede Altitud',

    // TopNav
    search_placeholder: 'Buscar cliente o propiedad...',
    header_title: 'Registro de Análisis de Mercado (ACM)',
    header_subtitle: 'Historial y creación algorítmica de valoración de propiedades.',

    // OKR Page
    okr_title: 'Dashboard OKR',
    okr_subtitle: 'Embudo de productividad — Registro diario vs Plan',
    okr_today_done: '✅ OKR de hoy completado',
    okr_today_pending: '📋 Registro diario pendiente',
    okr_today_done_desc: 'Puedes editar tu entrada del día en cualquier momento.',
    okr_today_pending_desc: 'Registra tus actividades del embudo de hoy.',
    okr_streak: 'días seguidos',
    okr_edit_btn: 'Editar OKR de Hoy',
    okr_complete_btn: 'Completar OKR de Hoy',
    okr_week_activities: 'Actividades Semana',
    okr_month_activities: 'Actividades Mes',
    okr_closes_ytd: 'Cierres YTD',
    okr_captures_ytd: 'Captaciones YTD',
    okr_streak_label: 'Racha Actual',
    okr_ytd_compliance: 'Cumplimiento YTD',
    okr_table_title: 'Embudo de Productividad — Plan vs Real',
    okr_table_subtitle: 'Navega semana a semana, mes a mes y por año para ver tu actividad.',
    okr_col_activity: 'Actividad',
    okr_col_week: 'Semana',
    okr_col_month: 'Mes',
    okr_funnel_title: 'Embudo de Conversión',
    okr_funnel_footer: 'Visualización proporcional al tope de actividades del embudo',
    okr_current: 'Actual',
    okr_week_of: 'Sem',
    okr_year: 'Año',
    okr_col_ytd: 'Año',
    okr_no_plan_title: 'Aún no tienes un Plan de Negocio',
    okr_no_plan_desc: 'Diseña tu plan juntos — conecta con tu para qué y calcula tu gestión semanal.',
    okr_no_plan_cta: 'Crear Mi Plan de Negocio',

    // Daily Form
    form_title: 'Completar OKR de Hoy',
    form_footer: 'Los datos auto-detectados se combinan con tu entrada manual.',
    form_save: 'Guardar OKR',
    form_auto: 'Auto',

    // Activities
    act_llamadas: 'Llamadas de Prospección',
    act_prelistings: 'Entrevistas Pre-Listing',
    act_acm: 'ACM Creados',
    act_listings: 'Entrevista Listing (ACM Presentado)',
    act_captaciones: 'Captaciones',
    act_consultas: 'Consultas a Propiedades',
    act_muestras: 'Muestras de Propiedades',
    act_reservas: 'Reservas',
    act_transacciones: 'Transacciones',
    act_cierres: 'Cierres',

    // Sidebar extra
    nav_transactions: 'Transacciones',

    // Plan bar (legacy compact view in OKR)
    plan_title: 'Tu Plan de Negocio',
    plan_subtitle: 'Metas mensuales definidas al iniciar en el equipo',
    plan_edit: 'Editar Plan',
    plan_monthly: 'Meta Mensual',
    plan_weekly: 'Meta Semanal',
    plan_save: 'Guardar Plan',
    plan_cancel: 'Cancelar',
    plan_compliance: 'Cumplimiento del Plan',
    plan_month_progress: 'Progreso del mes',

    // ── Plan Wizard ──
    pw_page_title: 'Mi Plan de Negocio',
    pw_page_subtitle: 'Diseña tu negocio, conecta con tu propósito',
    pw_next: 'Siguiente',
    pw_back: 'Anterior',
    pw_activate: '¡Activar Mi Plan!',
    pw_step: 'Paso',
    pw_of: 'de',
    pw_saving: 'Guardando...',
    pw_saved: 'Plan guardado',
    pw_save_draft: 'Guardar borrador',

    // Step 1: Para Qué
    pw_s1_title: 'Tu Para Qué',
    pw_s1_subtitle: '¿Por qué haces esto? ¿Qué quieres lograr más allá del dinero?',
    pw_s1_hero: 'Antes de hablar de números, hablemos de lo que importa.',
    pw_s1_hero2: 'Este plan no es solo un ejercicio financiero — es un mapa hacia la vida que quieres construir.',
    pw_s1_hero3: 'Cierra los ojos un momento. ¿Qué ves cuando piensas en tu mejor versión?',
    pw_s1_placeholder: 'Escribe aquí tu propósito, tu motivación más profunda...',
    pw_s1_prompt1: 'Libertad financiera para mi familia',
    pw_s1_prompt2: 'Viajar y conocer el mundo',
    pw_s1_prompt3: 'Ser el agente #1 de mi zona',
    pw_s1_prompt4: 'Darle la mejor educación a mis hijos',
    pw_s1_prompt5: 'Construir mi patrimonio propio',
    pw_s1_prompt6: 'Independencia y tiempo para lo que amo',

    // Step 2: Gastos de Vida
    pw_s2_title: 'Gastos de Vida',
    pw_s2_subtitle: '¿Cuánto necesitas al mes para vivir?',
    pw_s2_currency: 'Moneda principal',
    pw_s2_exchange: 'Tipo de cambio',
    pw_s2_exchange_src: 'Fuente: Banco Central de Costa Rica',
    pw_s2_exchange_buy: 'Compra',
    pw_s2_exchange_sell: 'Venta',
    pw_s2_add: '+ Agregar gasto',
    pw_s2_total: 'Total gastos de vida',
    pw_s2_cat_rent: 'Alquiler / Hipoteca',
    pw_s2_cat_utilities: 'Servicios (agua, luz, internet)',
    pw_s2_cat_food: 'Alimentación',
    pw_s2_cat_transport: 'Transporte personal',
    pw_s2_cat_education: 'Educación',
    pw_s2_cat_health: 'Salud / Seguro',
    pw_s2_cat_entertainment: 'Entretenimiento',
    pw_s2_cat_savings: 'Ahorro personal',
    pw_s2_cat_custom: 'Otro',
    pw_s2_equivalent: 'Equivalente a',

    // Step 3: Gastos del Negocio
    pw_s3_title: 'Gastos del Negocio',
    pw_s3_subtitle: 'Tu inversión como empresario inmobiliario',
    pw_s3_add: '+ Agregar gasto',
    pw_s3_total: 'Total gastos del negocio',
    pw_s3_annual: 'Anual',
    pw_s3_monthly_calc: '/mes',
    pw_s3_cat_office: 'Fee de Oficina (RE/MAX)',
    pw_s3_cat_signs: 'Rótulos / Signage',
    pw_s3_cat_gas: 'Gasolina',
    pw_s3_cat_phone: 'Teléfono / Plan datos',
    pw_s3_cat_marketing: 'Marketing / Publicidad',
    pw_s3_cat_convention: 'Convención anual',
    pw_s3_cat_training: 'Capacitación',
    pw_s3_cat_platforms: 'Plataformas digitales',
    pw_s3_cat_custom: 'Otro',
    pw_s3_running_total: 'Total acumulado (vida + negocio)',
    pw_s3_split_title: 'Sistema Comisional RE/MAX',
    pw_s3_split_subtitle: 'Selecciona tu plan comisional actual',
    pw_s3_split_fee: 'Fee mensual',
    pw_s3_split_commission: 'Tu comisión',
    pw_s3_split_selected: 'Seleccionado',

    // Step 4: Metas
    pw_s4_title: 'Tus Metas',
    pw_s4_subtitle: 'Los sueños que van más allá de sobrevivir',
    pw_s4_add: '+ Agregar meta',
    pw_s4_total: 'Total metas mensuales',
    pw_s4_name: 'Nombre de la meta',
    pw_s4_amount: 'Monto total',
    pw_s4_months: 'meses',
    pw_s4_per_month: 'por mes',
    pw_s4_remove: 'Eliminar',
    pw_s4_sug_car: 'Carro nuevo',
    pw_s4_sug_travel: 'Viaje',
    pw_s4_sug_house: 'Inicial de casa',
    pw_s4_sug_wedding: 'Boda',
    pw_s4_sug_degree: 'Maestría',
    pw_s4_sug_fund: 'Fondo de emergencia',
    pw_s4_sug_school: 'Colegio de hijos',

    // Step 5: Gestión
    pw_s5_title: 'Tu Gestión Semanal',
    pw_s5_subtitle: 'El momento de la verdad — tu número mágico',
    pw_s5_summary_title: 'Tu Plan Mensual',
    pw_s5_living: 'Gastos de vida',
    pw_s5_business: 'Gastos de negocio',
    pw_s5_goals_label: 'Tus metas',
    pw_s5_grand_total: 'NECESITAS GENERAR',
    pw_s5_zone_title: 'Datos de Tu Zona',
    pw_s5_avg_ticket: 'Ticket promedio de la zona',
    pw_s5_commission: 'Comisión total (%)',
    pw_s5_agent_split: 'Tu porcentaje del split (%)',
    pw_s5_calc_title: 'El Cálculo',
    pw_s5_per_close: 'Comisión por cierre',
    pw_s5_closes_needed: 'Cierres necesarios al mes',
    pw_s5_ratios_title: 'Ratios de Conversión',
    pw_s5_ratios_desc: 'Personaliza tus ratios basados en tu experiencia',
    pw_s5_ratio_calls: 'Llamadas → Pre-listing',
    pw_s5_ratio_pre_acm: 'Pre-listing → ACM',
    pw_s5_ratio_acm_list: 'ACM → Listing',
    pw_s5_ratio_list_cap: 'Listing → Captación',
    pw_s5_ratio_cap_close: 'Captación → Cierre',
    pw_s5_weekly_title: 'TU GESTIÓN SEMANAL',
    pw_s5_weekly_subtitle: 'Esto es lo que tienes que hacer cada semana',
    pw_s5_monthly_title: 'Meta mensual',
    pw_s5_weekly_label: 'Meta semanal',
    pw_s5_per_week: '/semana',
    pw_s5_per_month: '/mes',
    pw_s5_congratulations: '¡Tu plan está listo!',
    pw_s5_congrats_desc: 'Activa tu plan y empieza a hacer realidad tus sueños.',

    // Day names
    day_mon: 'Lun', day_tue: 'Mar', day_wed: 'Mié', day_thu: 'Jue', day_fri: 'Vie', day_sat: 'Sáb', day_sun: 'Dom',

    // Dashboard — Pre-Listing Hub
    dash_prelisting_title: 'Pre-Listing Hub',
    dash_prelisting_subtitle: 'Pipeline de Captación y Calificación',
    dash_btn_new_interview: 'Nueva Entrevista',
    dash_stat_interviews: 'Entrevistas Realizadas',
    dash_stat_followup: 'En Seguimiento (Follow Up)',
    dash_stat_ready_acm: 'Listo para ACM',
    dash_stat_conversion: 'Tasa de Conversión',
    dash_tab_all: 'Todos',
    dash_tab_pending: 'Pendientes',
    dash_tab_done: 'Realizadas',
    dash_tab_followup: 'Follow Up',
    dash_tab_rejected: 'Rechazadas',
    dash_tab_make_acm: 'Hacer ACM',
    dash_th_client: 'Cliente / Interés',
    dash_th_zone: 'Zona Geográfica',
    dash_th_contact: 'Último Contacto',
    dash_th_status: 'Status Pipeline',
    dash_th_action: 'Acción',
    dash_time_2days: 'Hace 2 Días',
    dash_time_yesterday: 'Ayer',
    dash_time_today: 'Hoy',
    dash_btn_detail: 'Ver Detalle',
    dash_badge_followup: 'Follow Up',

    // Dashboard — ACM Registry
    dash_acm_title: 'Registro ACM',
    dash_acm_subtitle: 'Análisis Comparativo de Mercado',
    dash_btn_new_acm: 'Nuevo ACM',
    dash_acm_empty: 'No hay reportes ACM recientes',
  },
  en: {
    // Sidebar
    nav_principal: 'Main',
    nav_crm: 'CRM & Leads',
    nav_soon: 'Soon',
    nav_okr: 'OKR Dashboard',
    nav_plan: 'My Plan',
    nav_tools: 'Tools',
    nav_prelisting: 'Pre-Listing',
    nav_acm: 'CMA Registry',
    nav_magic: 'Magic Links',
    nav_search: 'Search',
    nav_portfolio: 'Portfolio',
    nav_properties: 'My Properties',
    agent_hq: 'Altitude HQ',

    // TopNav
    search_placeholder: 'Search client or property...',
    header_title: 'CMA Registry',
    header_subtitle: 'Property valuation history and algorithmic creation.',

    // OKR Page
    okr_title: 'OKR Dashboard',
    okr_subtitle: 'Productivity funnel — Daily log vs Plan',
    okr_today_done: '✅ Today\'s OKR completed',
    okr_today_pending: '📋 Daily log pending',
    okr_today_done_desc: 'You can edit today\'s entry at any time.',
    okr_today_pending_desc: 'Log your funnel activities for today.',
    okr_streak: 'day streak',
    okr_edit_btn: 'Edit Today\'s OKR',
    okr_complete_btn: 'Complete Today\'s OKR',
    okr_week_activities: 'Week Activities',
    okr_month_activities: 'Month Activities',
    okr_closes_ytd: 'Closings YTD',
    okr_captures_ytd: 'Listings YTD',
    okr_streak_label: 'Current Streak',
    okr_ytd_compliance: 'YTD Compliance',
    okr_table_title: 'Productivity Funnel — Plan vs Actual',
    okr_table_subtitle: 'Navigate week by week, month by month, and by year to see your activity.',
    okr_col_activity: 'Activity',
    okr_col_week: 'Week',
    okr_col_month: 'Month',
    okr_col_ytd: 'Year',
    okr_funnel_title: 'Conversion Funnel',
    okr_funnel_footer: 'Proportional visualization based on top-of-funnel activities',
    okr_current: 'Current',
    okr_week_of: 'Wk',
    okr_year: 'Year',
    okr_no_plan_title: 'You don\'t have a Business Plan yet',
    okr_no_plan_desc: 'Design your plan together — connect with your WHY and calculate your weekly targets.',
    okr_no_plan_cta: 'Create My Business Plan',

    // Daily Form
    form_title: 'Complete Today\'s OKR',
    form_footer: 'Auto-detected data is combined with your manual input.',
    form_save: 'Save OKR',
    form_auto: 'Auto',

    // Activities
    act_llamadas: 'Prospecting Calls',
    act_prelistings: 'Pre-Listing Interviews',
    act_acm: 'CMAs Created',
    act_listings: 'Listing Interview (CMA Presented)',
    act_captaciones: 'Listings Acquired',
    act_consultas: 'Property Inquiries',
    act_muestras: 'Property Showings',
    act_reservas: 'Reservations',
    act_transacciones: 'Transactions',
    act_cierres: 'Closings',

    // Sidebar extra
    nav_transactions: 'Transactions',

    // Plan bar (legacy compact view in OKR)
    plan_title: 'Your Business Plan',
    plan_subtitle: 'Monthly targets set when joining the team',
    plan_edit: 'Edit Plan',
    plan_monthly: 'Monthly Target',
    plan_weekly: 'Weekly Target',
    plan_save: 'Save Plan',
    plan_cancel: 'Cancel',
    plan_compliance: 'Plan Compliance',
    plan_month_progress: 'Month progress',

    // ── Plan Wizard ──
    pw_page_title: 'My Business Plan',
    pw_page_subtitle: 'Design your business, connect with your purpose',
    pw_next: 'Next',
    pw_back: 'Back',
    pw_activate: 'Activate My Plan!',
    pw_step: 'Step',
    pw_of: 'of',
    pw_saving: 'Saving...',
    pw_saved: 'Plan saved',
    pw_save_draft: 'Save draft',

    // Step 1: Para Qué
    pw_s1_title: 'Your WHY',
    pw_s1_subtitle: 'Why are you doing this? What do you want to achieve beyond money?',
    pw_s1_hero: 'Before we talk numbers, let\'s talk about what truly matters.',
    pw_s1_hero2: 'This plan isn\'t just a financial exercise — it\'s a map to the life you want to build.',
    pw_s1_hero3: 'Close your eyes for a moment. What do you see when you picture your best self?',
    pw_s1_placeholder: 'Write here your purpose, your deepest motivation...',
    pw_s1_prompt1: 'Financial freedom for my family',
    pw_s1_prompt2: 'Travel and see the world',
    pw_s1_prompt3: 'Be the #1 agent in my area',
    pw_s1_prompt4: 'Give my children the best education',
    pw_s1_prompt5: 'Build my own wealth',
    pw_s1_prompt6: 'Independence and time for what I love',

    // Step 2: Living Expenses
    pw_s2_title: 'Living Expenses',
    pw_s2_subtitle: 'How much do you need per month to live?',
    pw_s2_currency: 'Main currency',
    pw_s2_exchange: 'Exchange rate',
    pw_s2_exchange_src: 'Source: Central Bank of Costa Rica',
    pw_s2_exchange_buy: 'Buy',
    pw_s2_exchange_sell: 'Sell',
    pw_s2_add: '+ Add expense',
    pw_s2_total: 'Total living expenses',
    pw_s2_cat_rent: 'Rent / Mortgage',
    pw_s2_cat_utilities: 'Utilities (water, electric, internet)',
    pw_s2_cat_food: 'Groceries',
    pw_s2_cat_transport: 'Personal transport',
    pw_s2_cat_education: 'Education',
    pw_s2_cat_health: 'Health / Insurance',
    pw_s2_cat_entertainment: 'Entertainment',
    pw_s2_cat_savings: 'Personal savings',
    pw_s2_cat_custom: 'Other',
    pw_s2_equivalent: 'Equivalent to',

    // Step 3: Business Expenses
    pw_s3_title: 'Business Expenses',
    pw_s3_subtitle: 'Your investment as a real estate entrepreneur',
    pw_s3_add: '+ Add expense',
    pw_s3_total: 'Total business expenses',
    pw_s3_annual: 'Annual',
    pw_s3_monthly_calc: '/mo',
    pw_s3_cat_office: 'Office Fee (RE/MAX)',
    pw_s3_cat_signs: 'Signs / Signage',
    pw_s3_cat_gas: 'Gas',
    pw_s3_cat_phone: 'Phone / Data plan',
    pw_s3_cat_marketing: 'Marketing / Advertising',
    pw_s3_cat_convention: 'Annual convention',
    pw_s3_cat_training: 'Training',
    pw_s3_cat_platforms: 'Digital platforms',
    pw_s3_cat_custom: 'Other',
    pw_s3_running_total: 'Running total (life + business)',
    pw_s3_split_title: 'RE/MAX Commission System',
    pw_s3_split_subtitle: 'Select your current commission plan',
    pw_s3_split_fee: 'Monthly fee',
    pw_s3_split_commission: 'Your commission',
    pw_s3_split_selected: 'Selected',

    // Step 4: Goals
    pw_s4_title: 'Your Goals',
    pw_s4_subtitle: 'The dreams that go beyond surviving',
    pw_s4_add: '+ Add goal',
    pw_s4_total: 'Total monthly goals',
    pw_s4_name: 'Goal name',
    pw_s4_amount: 'Total amount',
    pw_s4_months: 'months',
    pw_s4_per_month: 'per month',
    pw_s4_remove: 'Remove',
    pw_s4_sug_car: 'New car',
    pw_s4_sug_travel: 'Trip',
    pw_s4_sug_house: 'House down payment',
    pw_s4_sug_wedding: 'Wedding',
    pw_s4_sug_degree: 'Master\'s degree',
    pw_s4_sug_fund: 'Emergency fund',
    pw_s4_sug_school: 'Children\'s school',

    // Step 5: Management
    pw_s5_title: 'Your Weekly Plan',
    pw_s5_subtitle: 'The moment of truth — your magic number',
    pw_s5_summary_title: 'Your Monthly Plan',
    pw_s5_living: 'Living expenses',
    pw_s5_business: 'Business expenses',
    pw_s5_goals_label: 'Your goals',
    pw_s5_grand_total: 'YOU NEED TO GENERATE',
    pw_s5_zone_title: 'Your Zone Data',
    pw_s5_avg_ticket: 'Average ticket in zone',
    pw_s5_commission: 'Total commission (%)',
    pw_s5_agent_split: 'Your split percentage (%)',
    pw_s5_calc_title: 'The Calculation',
    pw_s5_per_close: 'Commission per closing',
    pw_s5_closes_needed: 'Closings needed per month',
    pw_s5_ratios_title: 'Conversion Ratios',
    pw_s5_ratios_desc: 'Customize your ratios based on your experience',
    pw_s5_ratio_calls: 'Calls → Pre-listing',
    pw_s5_ratio_pre_acm: 'Pre-listing → CMA',
    pw_s5_ratio_acm_list: 'CMA → Listing',
    pw_s5_ratio_list_cap: 'Listing → Acquisition',
    pw_s5_ratio_cap_close: 'Acquisition → Closing',
    pw_s5_weekly_title: 'YOUR WEEKLY PLAN',
    pw_s5_weekly_subtitle: 'This is what you need to do every week',
    pw_s5_monthly_title: 'Monthly target',
    pw_s5_weekly_label: 'Weekly target',
    pw_s5_per_week: '/week',
    pw_s5_per_month: '/month',
    pw_s5_congratulations: 'Your plan is ready!',
    pw_s5_congrats_desc: 'Activate your plan and start making your dreams come true.',

    // Day names
    day_mon: 'Mon', day_tue: 'Tue', day_wed: 'Wed', day_thu: 'Thu', day_fri: 'Fri', day_sat: 'Sat', day_sun: 'Sun',

    // Dashboard — Pre-Listing Hub
    dash_prelisting_title: 'Pre-Listing Hub',
    dash_prelisting_subtitle: 'Acquisition & Qualification Pipeline',
    dash_btn_new_interview: 'New Interview',
    dash_stat_interviews: 'Interviews Completed',
    dash_stat_followup: 'In Follow Up',
    dash_stat_ready_acm: 'Ready for CMA',
    dash_stat_conversion: 'Conversion Rate',
    dash_tab_all: 'All',
    dash_tab_pending: 'Pending',
    dash_tab_done: 'Completed',
    dash_tab_followup: 'Follow Up',
    dash_tab_rejected: 'Rejected',
    dash_tab_make_acm: 'Create CMA',
    dash_th_client: 'Client / Interest',
    dash_th_zone: 'Geographic Zone',
    dash_th_contact: 'Last Contact',
    dash_th_status: 'Status Pipeline',
    dash_th_action: 'Action',
    dash_time_2days: '2 Days Ago',
    dash_time_yesterday: 'Yesterday',
    dash_time_today: 'Today',
    dash_btn_detail: 'View Details',
    dash_badge_followup: 'Follow Up',

    // Dashboard — ACM Registry
    dash_acm_title: 'CMA Registry',
    dash_acm_subtitle: 'Comparative Market Analysis',
    dash_btn_new_acm: 'New CMA',
    dash_acm_empty: 'No recent CMA reports',
  },
};

/* ═══════════════════════════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════════════════════════ */
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLangState] = useState('es');
  const [theme, setThemeState] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Init from localStorage
  useEffect(() => {
    const savedLang  = localStorage.getItem('app-lang')    || 'es';
    const savedTheme = localStorage.getItem('color-theme') || 'light';
    setLangState(savedLang);
    setThemeState(savedTheme);
    setMounted(true);
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mounted]);

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next = prev === 'es' ? 'en' : 'es';
      localStorage.setItem('app-lang', next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('color-theme', next);
      return next;
    });
  }, []);

  const t = useCallback((key) => {
    return T[lang]?.[key] ?? T['es']?.[key] ?? key;
  }, [lang]);

  return (
    <AppContext.Provider value={{ lang, theme, toggleLang, toggleTheme, t, mounted }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
