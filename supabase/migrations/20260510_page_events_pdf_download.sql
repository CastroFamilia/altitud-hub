-- Add pdf_download to page_events event_type
ALTER TABLE public.page_events DROP CONSTRAINT page_events_event_type_check;

ALTER TABLE public.page_events ADD CONSTRAINT page_events_event_type_check 
CHECK (event_type IN (
  'page_view', 'listing_click', 'whatsapp_click', 'faq_expand',
  'lead_submit', 'gallery_view', 'video_play', 'social_click', 'map_interact',
  'pdf_download'
));
