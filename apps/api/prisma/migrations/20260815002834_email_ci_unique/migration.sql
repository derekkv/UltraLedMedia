-- Unicidad de email case-insensitive (además del UNIQUE exacto de Prisma).
-- Evita registrar "User@x.com" y "user@x.com" como cuentas distintas.
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (LOWER("email"));
