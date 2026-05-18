-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('patient', 'doctor', 'institution_admin');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('hospital', 'clinic');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "wallet" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "institutionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" SERIAL NOT NULL,
    "institutionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "institutionType" "InstitutionType" NOT NULL,
    "adminWallet" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_key" ON "users"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_institutionId_key" ON "institutions"("institutionId");
