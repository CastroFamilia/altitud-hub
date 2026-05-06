-- =============================================
-- Contacts Languages & Type Update
-- Adds tertiary and favorite languages, and converts type to array
-- =============================================

DO $$
BEGIN
    -- Add tertiary language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='tertiary_language') THEN
        ALTER TABLE contacts ADD COLUMN tertiary_language TEXT DEFAULT 'Ninguno';
    END IF;

    -- Add favorite language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='favorite_language') THEN
        ALTER TABLE contacts ADD COLUMN favorite_language TEXT DEFAULT 'Español';
    END IF;
END $$;

-- Convert 'type' column to TEXT[] to support multiple selections
-- Uses string_to_array to preserve existing single values like 'Comprador' -> {'Comprador'}
ALTER TABLE contacts ALTER COLUMN type TYPE TEXT[] USING string_to_array(type, ',');
