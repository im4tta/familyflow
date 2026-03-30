-- FamilyFlow Database Schema
-- Run this on a fresh Neon (or any Postgres) database to initialize all tables.
-- The app also auto-runs this on first launch via initDB().

-- Developmental milestones
CREATE TABLE IF NOT EXISTS milestones (
  id              TEXT PRIMARY KEY,
  title           TEXT,
  category        TEXT,
  ageMonth        NUMERIC,
  completed       BOOLEAN,
  dateCompleted   TEXT,
  notes           TEXT,
  photoUrl        TEXT,
  linkedGrowthId  TEXT
);

-- Health records (vaccines, visits, medications, illnesses, allergies, grooming)
CREATE TABLE IF NOT EXISTS health_records (
  id                TEXT PRIMARY KEY,
  type              TEXT,
  title             TEXT,
  date              TEXT,
  endDate           TEXT,
  time              TEXT,
  notes             TEXT,
  nextDueDate       TEXT,
  status            TEXT,
  doctorName        TEXT,
  memberId          TEXT,
  medicineName      TEXT,
  medicineUsage     TEXT,
  medicinePhotoUrl  TEXT,
  dosage            TEXT,
  frequency         TEXT,
  medications       JSONB
);

-- Expenses and subscriptions
CREATE TABLE IF NOT EXISTS expenses (
  id              TEXT PRIMARY KEY,
  title           TEXT,
  amount          NUMERIC,
  category        TEXT,
  date            TEXT,
  isSubscription  BOOLEAN,
  frequency       TEXT,
  renewalDate     TEXT,
  status          TEXT
);

-- Family trips and itineraries
CREATE TABLE IF NOT EXISTS trips (
  id         TEXT PRIMARY KEY,
  title      TEXT,
  location   TEXT,
  startDate  TEXT,
  startTime  TEXT,
  endDate    TEXT,
  endTime    TEXT,
  status     TEXT,
  todos      JSONB
);

-- Family members / caregivers
CREATE TABLE IF NOT EXISTS caregivers (
  id           TEXT PRIMARY KEY,
  name         TEXT,
  role         TEXT,
  phone        TEXT,
  email        TEXT,
  accessLevel  TEXT,
  lastActive   TEXT,
  photoUrl     TEXT,
  dateOfBirth  TEXT,
  bloodType    TEXT,
  allergies    TEXT,
  doctorName   TEXT
);

-- Child growth measurements
CREATE TABLE IF NOT EXISTS growth_records (
  id                   TEXT PRIMARY KEY,
  date                 TEXT,
  ageMonths            NUMERIC,
  heightCm             NUMERIC,
  weightKg             NUMERIC,
  headCircumferenceCm  NUMERIC
);

-- Per-user app settings
CREATE TABLE IF NOT EXISTS app_settings (
  user_id        TEXT PRIMARY KEY,
  font           TEXT,
  density        TEXT,
  accentColor    TEXT,
  glassIntensity TEXT,
  language       TEXT,
  monthlyBudget  NUMERIC,
  cornerRadius   TEXT,
  appStyle       TEXT,
  liveBackground TEXT,
  loan_stage     NUMERIC,
  loan_fees      TEXT
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_health_member    ON health_records(memberId);
CREATE INDEX IF NOT EXISTS idx_health_date      ON health_records(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date    ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_milestones_done  ON milestones(completed);
