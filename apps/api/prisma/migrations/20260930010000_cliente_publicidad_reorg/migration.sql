-- Reorganización de "Información de la publicidad":
--  - se elimina "¿qué desea publicitar?" y "texto de pantalla"
--  - se agrega "reproducciones mensuales"

-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "que_desea_publicitar";
ALTER TABLE "clientes" DROP COLUMN "texto_pantalla";

-- AddColumn (con default temporal para filas existentes, luego se retira el default)
ALTER TABLE "clientes" ADD COLUMN "reproducciones_mensuales" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clientes" ALTER COLUMN "reproducciones_mensuales" DROP DEFAULT;
