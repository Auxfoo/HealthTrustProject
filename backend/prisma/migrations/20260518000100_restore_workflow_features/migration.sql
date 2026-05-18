ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "encryptionPublicKey" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bloodType" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "allergies" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "chronicConditions" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;

CREATE TABLE IF NOT EXISTS "record_metadata" (
  "id" SERIAL PRIMARY KEY,
  "recordId" INTEGER NOT NULL UNIQUE,
  "ownerWallet" TEXT NOT NULL,
  "filename" TEXT,
  "mimeType" TEXT,
  "title" TEXT,
  "category" TEXT NOT NULL DEFAULT 'other',
  "provider" TEXT,
  "visitDate" TIMESTAMP(3),
  "notes" TEXT,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "important" BOOLEAN NOT NULL DEFAULT false,
  "emergency" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "record_keys" (
  "id" SERIAL PRIMARY KEY,
  "recordId" INTEGER NOT NULL,
  "ownerWallet" TEXT NOT NULL,
  "recipientWallet" TEXT NOT NULL,
  "encryptedKey" TEXT NOT NULL,
  "accessType" TEXT NOT NULL DEFAULT 'doctor',
  "accessTarget" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "record_keys_recordId_recipientWallet_key" ON "record_keys"("recordId", "recipientWallet");

CREATE TABLE IF NOT EXISTS "access_requests" (
  "id" SERIAL PRIMARY KEY,
  "recordId" INTEGER NOT NULL,
  "patientWallet" TEXT NOT NULL,
  "requesterWallet" TEXT NOT NULL,
  "requestType" TEXT NOT NULL DEFAULT 'doctor',
  "institutionId" INTEGER,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "doctor_notes" (
  "id" SERIAL PRIMARY KEY,
  "recordId" INTEGER NOT NULL,
  "patientWallet" TEXT NOT NULL,
  "doctorWallet" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'reviewed',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "doctor_notes_recordId_doctorWallet_key" ON "doctor_notes"("recordId", "doctorWallet");

CREATE TABLE IF NOT EXISTS "prediction_history" (
  "id" SERIAL PRIMARY KEY,
  "doctorWallet" TEXT NOT NULL,
  "patientWallet" TEXT,
  "prediction" INTEGER NOT NULL,
  "probability" DOUBLE PRECISION NOT NULL,
  "features" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "institution_join_requests" (
  "id" SERIAL PRIMARY KEY,
  "institutionId" INTEGER NOT NULL,
  "doctorWallet" TEXT NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "doctor_documents" (
  "id" SERIAL PRIMARY KEY,
  "patientWallet" TEXT NOT NULL,
  "doctorWallet" TEXT NOT NULL,
  "recordId" INTEGER,
  "cid" TEXT,
  "encrypted" BOOLEAN NOT NULL DEFAULT false,
  "documentType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "wallet" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
