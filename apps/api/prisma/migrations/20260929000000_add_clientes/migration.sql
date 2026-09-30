-- CreateEnum
CREATE TYPE "GrupoComercial" AS ENUM ('GASTRONOMIA', 'ROPA_MODA', 'SALUD_BELLEZA', 'TECNOLOGIA', 'LICORES_DISCOTECA', 'SUPERMERCADO_TIENDA', 'SERVICIOS_PROFESIONALES', 'FERRETERIA_CONSTRUCCION', 'EDUCACION', 'OTRO');

-- CreateEnum
CREATE TYPE "MaterialPublicidad" AS ENUM ('ENTREGA_MATERIAL', 'SOLICITA_DISENO');

-- CreateEnum
CREATE TYPE "DuracionSpot" AS ENUM ('SEG_10', 'SEG_15', 'SEG_20', 'SEG_30');

-- CreateEnum
CREATE TYPE "PlanContratado" AS ENUM ('DIARIO', 'SEMANAL', 'MENSUAL', 'TRIMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "ModalidadPago" AS ENUM ('TRANSFERENCIA', 'EFECTIVO', 'DEUNA_PAYPHONE');

-- CreateEnum
CREATE TYPE "FacturaCon" AS ENUM ('DATOS_RUC', 'CONSUMIDOR_FINAL');

-- CreateEnum
CREATE TYPE "ClienteEstado" AS ENUM ('ACTIVO', 'PAUSADO', 'VENCIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "razon_social" TEXT NOT NULL,
    "ruc_cedula" TEXT NOT NULL,
    "representante_legal" TEXT,
    "actividad_negocio" TEXT,
    "grupo_comercial" "GrupoComercial" NOT NULL,
    "grupo_comercial_otro" TEXT,
    "direccion_local" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "persona_contacto" TEXT,
    "telefono_whatsapp" TEXT,
    "email_acceso_en_vivo" TEXT,
    "que_desea_publicitar" TEXT,
    "tiene_material" "MaterialPublicidad" NOT NULL,
    "costo_diseno_extra" DECIMAL(12,2),
    "texto_pantalla" TEXT,
    "duracion_spot" "DuracionSpot" NOT NULL,
    "pantallas_asignadas" TEXT,
    "ubicacion_pantallas" TEXT,
    "fecha_inicio" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "plan_contratado" "PlanContratado" NOT NULL,
    "valor_plan" DECIMAL(12,2) NOT NULL,
    "reproducciones_diarias" INTEGER NOT NULL,
    "dia_pago_mensual" INTEGER NOT NULL,
    "modalidad_pago" "ModalidadPago" NOT NULL,
    "factura_con" "FacturaCon" NOT NULL,
    "notas" TEXT,
    "estado" "ClienteEstado" NOT NULL DEFAULT 'ACTIVO',
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_ruc_cedula_key" ON "clientes"("ruc_cedula");

-- CreateIndex
CREATE INDEX "clientes_estado_idx" ON "clientes"("estado");

-- CreateIndex
CREATE INDEX "clientes_created_at_idx" ON "clientes"("created_at");

-- CreateIndex
CREATE INDEX "clientes_razon_social_idx" ON "clientes"("razon_social");
