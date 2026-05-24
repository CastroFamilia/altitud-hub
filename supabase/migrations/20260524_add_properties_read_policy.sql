-- ============================================================
-- CONNECT ALL OFFICES: ALLOW AGENTS TO VIEW APPROVED & PUBLISHED PROPERTIES
-- Allows agents from ALTITUD and ALTITUD CERO to view each other's 
-- approved/published properties for CMA (ACM) and search purposes.
-- ============================================================

-- 1. Policy for properties table
-- Allow all authenticated users to read approved or published properties
DROP POLICY IF EXISTS "Agents can view approved and published properties" ON public.properties;
CREATE POLICY "Agents can view approved and published properties"
    ON public.properties FOR SELECT
    TO authenticated
    USING (status IN ('approved', 'published'));

-- 2. Policy for property_images table
-- Allow all authenticated users to read images of properties they have access to
DROP POLICY IF EXISTS "Agents can view readable property images" ON public.property_images;
CREATE POLICY "Agents can view readable property images"
    ON public.property_images FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE public.properties.id = public.property_images.property_id
        )
    );
