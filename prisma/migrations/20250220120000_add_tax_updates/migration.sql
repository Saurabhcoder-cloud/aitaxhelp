-- CreateTable
CREATE TABLE "TaxUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "impactType" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TaxUpdate_jurisdiction_idx" ON "TaxUpdate"("jurisdiction");

-- CreateIndex
CREATE INDEX "TaxUpdate_languageCode_idx" ON "TaxUpdate"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "date_jurisdiction_title_languageCode" ON "TaxUpdate"("date", "jurisdiction", "title", "languageCode");
