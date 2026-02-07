-- DigiJamabandi Database Initialization Script
-- This script runs when PostgreSQL container starts

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- For UUID generation

-- Create default roles
INSERT INTO roles (id, name, description, permissions) VALUES
    (uuid_generate_v4(), 'admin', 'System Administrator', '["all"]'::jsonb),
    (uuid_generate_v4(), 'officer', 'Land Revenue Officer', '["view_records", "upload_data", "run_reconciliation", "verify_matches", "generate_reports", "view_map", "manage_villages"]'::jsonb),
    (uuid_generate_v4(), 'surveyor', 'Field Surveyor', '["view_records", "upload_data", "view_map"]'::jsonb),
    (uuid_generate_v4(), 'viewer', 'Read-only Viewer', '["view_records", "view_map"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Create default admin user (password: Admin@123)
-- Note: In production, change this password immediately
INSERT INTO users (id, email, password_hash, full_name, role_id, is_active) 
SELECT 
    uuid_generate_v4(),
    'admin@digijamabandi.gov.in',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.S5N7.1S4xMfpba',  -- Admin@123
    'System Administrator',
    id,
    true
FROM roles WHERE name = 'admin'
ON CONFLICT (email) DO NOTHING;

-- Sample villages for testing
INSERT INTO villages (id, village_id, name, name_hindi, district, tehsil, state) VALUES
    (uuid_generate_v4(), 'V001', 'Ramgarh', 'रामगढ़', 'Jaipur', 'Amber', 'Rajasthan'),
    (uuid_generate_v4(), 'V002', 'Kishanpura', 'किशनपुरा', 'Jaipur', 'Amber', 'Rajasthan'),
    (uuid_generate_v4(), 'V003', 'Govindpura', 'गोविंदपुरा', 'Jaipur', 'Sanganer', 'Rajasthan'),
    (uuid_generate_v4(), 'V004', 'Shyamnagar', 'श्यामनगर', 'Jaipur', 'Sanganer', 'Rajasthan'),
    (uuid_generate_v4(), 'V005', 'Banipark', 'बानीपार्क', 'Jaipur', 'Jaipur City', 'Rajasthan')
ON CONFLICT (village_id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parcels_geom ON parcels USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_parcels_owner_trgm ON parcels USING GIN (owner_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_text_records_owner_trgm ON text_records USING GIN (owner_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Verify PostGIS installation
SELECT PostGIS_version();
