-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "category_stats" JSONB NOT NULL,
    "tolerance_stats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
