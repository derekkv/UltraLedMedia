-- AlterEnum
-- Nuevos grupos comerciales: vehículo liviano y vehículo pesado (antes de "OTRO").
ALTER TYPE "GrupoComercial" ADD VALUE 'VEHICULOS_LIVIANOS' BEFORE 'OTRO';
ALTER TYPE "GrupoComercial" ADD VALUE 'VEHICULOS_PESADOS' BEFORE 'OTRO';

-- CreateTable
CREATE TABLE "cliente_archivos" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cliente_archivos_cliente_id_idx" ON "cliente_archivos"("cliente_id");

-- AddForeignKey
ALTER TABLE "cliente_archivos" ADD CONSTRAINT "cliente_archivos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
