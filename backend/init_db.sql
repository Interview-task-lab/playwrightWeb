-- 1. Tabloların Hazırlanması (Şema)

-- Domain tablosu
CREATE TABLE IF NOT EXISTS domains (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  parent_id   INTEGER REFERENCES domains(id) ON DELETE CASCADE
);

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'qa',
  domain_id     INTEGER      REFERENCES domains(id) ON DELETE SET NULL,
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- Test Cases tablosuna gerekli kolonların eklenmesi
CREATE TABLE IF NOT EXISTS test_cases (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  url         TEXT,
  platform    VARCHAR(10) NOT NULL DEFAULT 'web',
  code        TEXT NOT NULL,
  steps       JSONB NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE test_cases 
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL;

-- Run Configurations tablosu
CREATE TABLE IF NOT EXISTS run_configurations (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  type             VARCHAR(20) NOT NULL,
  domain_ids       INTEGER[] NOT NULL,
  last_report_url  VARCHAR(512) DEFAULT NULL,
  is_serial        BOOLEAN DEFAULT TRUE,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Run Configuration Test Cases (Junction) tablosu
CREATE TABLE IF NOT EXISTS run_configuration_test_cases (
  run_configuration_id INTEGER REFERENCES run_configurations(id) ON DELETE CASCADE,
  test_case_id         INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
  sort_order           INTEGER DEFAULT 0,
  PRIMARY KEY (run_configuration_id, test_case_id)
);



-- 2. Verilerin Seed Edilmesi (Domainler ve 4 Kullanıcı)
-- NOT: Tüm kullanıcıların varsayılan şifresi "123456" olarak ayarlanmıştır.

-- Domainlerin eklenmesi (Parent domainler)
INSERT INTO domains (name, parent_id) VALUES 
('Kredi', NULL),
('Hesap', NULL)
ON CONFLICT (name) DO NOTHING;

-- Sub-domainlerin eklenmesi
INSERT INTO domains (name, parent_id) VALUES
('Bireysel Kredi', (SELECT id FROM domains WHERE name = 'Kredi')),
('Ticari Kredi', (SELECT id FROM domains WHERE name = 'Kredi')),
('Vadeli Hesap', (SELECT id FROM domains WHERE name = 'Hesap')),
('Vadesiz Hesap', (SELECT id FROM domains WHERE name = 'Hesap'))
ON CONFLICT (name) DO NOTHING;

-- Kullanıcıların eklenmesi
-- bcrypt şifre hash'i ($2b$10$kZdE8xuin9cqmz2r5OM5iOtaiVaWttzON7dOJr.4XBH7XZYzPHu8a -> "123456")
INSERT INTO users (username, first_name, last_name, password_hash, role, domain_id) VALUES 
(
  'admin', 
  'System', 
  'Admin', 
  '$2b$10$kZdE8xuin9cqmz2r5OM5iOtaiVaWttzON7dOJr.4XBH7XZYzPHu8a', 
  'admin', 
  NULL
),
(
  'qa_user', 
  'QA', 
  'Engineer', 
  '$2b$10$kZdE8xuin9cqmz2r5OM5iOtaiVaWttzON7dOJr.4XBH7XZYzPHu8a', 
  'qa', 
  NULL
),
(
  'loan_member', 
  'Loan', 
  'Member', 
  '$2b$10$kZdE8xuin9cqmz2r5OM5iOtaiVaWttzON7dOJr.4XBH7XZYzPHu8a', 
  'kredi_takimi', 
  (SELECT id FROM domains WHERE name = 'Kredi')
),
(
  'individual_loan_member', 
  'Individual Loan', 
  'Member', 
  '$2b$10$kZdE8xuin9cqmz2r5OM5iOtaiVaWttzON7dOJr.4XBH7XZYzPHu8a', 
  'kredi_takimi', 
  (SELECT id FROM domains WHERE name = 'Bireysel Kredi')
),
(
  'commercial_loan_member', 
  'Commercial Loan', 
  'Member', 
  '$2b$10$kZdE8xuin9cqmz2r5OM5iOtaiVaWttzON7dOJr.4XBH7XZYzPHu8a', 
  'kredi_takimi', 
  (SELECT id FROM domains WHERE name = 'Ticari Kredi')
),
(
  'account_member', 
  'Account', 
  'Member', 
  '$2b$10$kZdE8xuin9cqmz2r5OM5iOtaiVaWttzON7dOJr.4XBH7XZYzPHu8a', 
  'hesap_takimi', 
  (SELECT id FROM domains WHERE name = 'Vadeli Hesap')
)
ON CONFLICT (username) DO UPDATE 
SET first_name = EXCLUDED.first_name, 
    last_name = EXCLUDED.last_name, 
    domain_id = EXCLUDED.domain_id;
