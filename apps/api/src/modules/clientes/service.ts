import { Prisma } from '@prisma/client';
import type {
  ClienteCreateInput,
  ClienteEstadoUpdateInput,
  ClienteUpdateInput,
  ClienteEstado,
  DuracionSpot,
  FacturaCon,
  GrupoComercial,
  MaterialPublicidad,
  ModalidadPago,
  PlanContratado,
} from '@ultraled/shared';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { registry } from '../../ws/registry';

/** Módulo de negocio que "posee" los clientes; se usa para el broadcast en vivo. */
const MODULE = 'VENTA';

/** DTO expuesto al cliente. Fechas como AAAA-MM-DD, dinero como número, timestamps ISO. */
export interface ClienteDto {
  id: string;
  razonSocial: string;
  rucCedula: string;
  representanteLegal: string | null;
  actividadNegocio: string | null;
  grupoComercial: GrupoComercial;
  grupoComercialOtro: string | null;
  direccionLocal: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  personaContacto: string | null;
  telefonoWhatsapp: string | null;
  emailAccesoEnVivo: string | null;
  tieneMaterial: MaterialPublicidad;
  reproduccionesMensuales: number;
  reproduccionesDiarias: number;
  costoDisenoExtra: number | null;
  duracionSpot: DuracionSpot;
  pantallasAsignadas: string | null;
  ubicacionPantallas: string | null;
  fechaInicio: string;
  fechaVencimiento: string;
  planContratado: PlanContratado;
  valorPlan: number;
  diaPagoMensual: number;
  modalidadPago: ModalidadPago;
  facturaCon: FacturaCon;
  notas: string | null;
  estado: ClienteEstado;
  version: number;
  createdAt: string;
  updatedAt: string;
}

type ClienteRow = Prisma.ClienteGetPayload<Record<string, never>>;

/** Convierte una fecha AAAA-MM-DD a un Date en medianoche UTC (columna @db.Date). */
function toDbDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Extrae la parte AAAA-MM-DD de un Date almacenado como fecha. */
function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDto(c: ClienteRow): ClienteDto {
  return {
    id: c.id,
    razonSocial: c.razonSocial,
    rucCedula: c.rucCedula,
    representanteLegal: c.representanteLegal,
    actividadNegocio: c.actividadNegocio,
    grupoComercial: c.grupoComercial,
    grupoComercialOtro: c.grupoComercialOtro,
    direccionLocal: c.direccionLocal,
    facebook: c.facebook,
    instagram: c.instagram,
    tiktok: c.tiktok,
    personaContacto: c.personaContacto,
    telefonoWhatsapp: c.telefonoWhatsapp,
    emailAccesoEnVivo: c.emailAccesoEnVivo,
    tieneMaterial: c.tieneMaterial,
    reproduccionesMensuales: c.reproduccionesMensuales,
    reproduccionesDiarias: c.reproduccionesDiarias,
    costoDisenoExtra: c.costoDisenoExtra === null ? null : Number(c.costoDisenoExtra),
    duracionSpot: c.duracionSpot,
    pantallasAsignadas: c.pantallasAsignadas,
    ubicacionPantallas: c.ubicacionPantallas,
    fechaInicio: toDateString(c.fechaInicio),
    fechaVencimiento: toDateString(c.fechaVencimiento),
    planContratado: c.planContratado,
    valorPlan: Number(c.valorPlan),
    diaPagoMensual: c.diaPagoMensual,
    modalidadPago: c.modalidadPago,
    facturaCon: c.facturaCon,
    notas: c.notas,
    estado: c.estado,
    version: c.version,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Emite un evento en vivo a todos los conectados con acceso al módulo Venta. */
function broadcast(type: 'created' | 'updated' | 'deleted', cliente: { id: string }): void {
  registry.broadcastToModule(MODULE, { type: `cliente.${type}`, payload: { id: cliente.id } });
}

/** Mapea los campos del formulario (sin metadatos) al `data` de Prisma. */
function toWriteData(input: ClienteCreateInput) {
  return {
    razonSocial: input.razonSocial,
    rucCedula: input.rucCedula,
    representanteLegal: input.representanteLegal ?? null,
    actividadNegocio: input.actividadNegocio ?? null,
    grupoComercial: input.grupoComercial,
    grupoComercialOtro: input.grupoComercialOtro ?? null,
    direccionLocal: input.direccionLocal ?? null,
    facebook: input.facebook ?? null,
    instagram: input.instagram ?? null,
    tiktok: input.tiktok ?? null,
    personaContacto: input.personaContacto ?? null,
    telefonoWhatsapp: input.telefonoWhatsapp ?? null,
    emailAccesoEnVivo: input.emailAccesoEnVivo ?? null,
    tieneMaterial: input.tieneMaterial,
    reproduccionesMensuales: input.reproduccionesMensuales,
    reproduccionesDiarias: input.reproduccionesDiarias,
    costoDisenoExtra: input.costoDisenoExtra ?? null,
    duracionSpot: input.duracionSpot,
    pantallasAsignadas: input.pantallasAsignadas ?? null,
    ubicacionPantallas: input.ubicacionPantallas ?? null,
    fechaInicio: toDbDate(input.fechaInicio),
    fechaVencimiento: toDbDate(input.fechaVencimiento),
    planContratado: input.planContratado,
    valorPlan: new Prisma.Decimal(input.valorPlan),
    diaPagoMensual: input.diaPagoMensual,
    modalidadPago: input.modalidadPago,
    facturaCon: input.facturaCon,
    notas: input.notas ?? null,
  } satisfies Prisma.ClienteUncheckedUpdateInput;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export async function listClientes(params: {
  cursor?: string;
  limit: number;
  q?: string;
  estado?: ClienteEstado;
}): Promise<{ items: ClienteDto[]; nextCursor: string | null }> {
  const q = params.q?.trim();
  const where: Prisma.ClienteWhereInput = {
    ...(params.estado ? { estado: params.estado } : {}),
    ...(q
      ? {
          OR: [
            { razonSocial: { contains: q, mode: 'insensitive' } },
            { rucCedula: { contains: q.replace(/[\s-]+/g, '').toUpperCase(), mode: 'insensitive' } },
            { representanteLegal: { contains: q, mode: 'insensitive' } },
            { personaContacto: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const rows = await prisma.cliente.findMany({
    where,
    take: params.limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;
  return { items: items.map(toDto), nextCursor };
}

export async function getCliente(id: string): Promise<ClienteDto> {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new HttpError(404, 'CLIENTE_NOT_FOUND', 'Cliente no encontrado.');
  return toDto(cliente);
}

export async function createCliente(
  input: ClienteCreateInput,
  actorId: string | null,
): Promise<ClienteDto> {
  // Pre-chequeo amable; la unicidad real la garantiza el índice único (anti-dupeo atómico).
  const existing = await prisma.cliente.findUnique({ where: { rucCedula: input.rucCedula } });
  if (existing) {
    throw new HttpError(409, 'RUC_TAKEN', 'Ya existe un cliente con ese RUC / Cédula.');
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        ...(toWriteData(input) as Prisma.ClienteUncheckedCreateInput),
        createdById: actorId,
        updatedById: actorId,
      },
    });
    broadcast('created', cliente);
    return toDto(cliente);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HttpError(409, 'RUC_TAKEN', 'Ya existe un cliente con ese RUC / Cédula.');
    }
    throw err;
  }
}

export async function updateCliente(
  id: string,
  input: ClienteUpdateInput,
  actorId: string | null,
): Promise<ClienteDto> {
  const existing = await prisma.cliente.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'CLIENTE_NOT_FOUND', 'Cliente no encontrado.');

  // Si cambia el RUC, verifica que no colisione con otro registro.
  if (input.rucCedula !== existing.rucCedula) {
    const dup = await prisma.cliente.findUnique({ where: { rucCedula: input.rucCedula } });
    if (dup && dup.id !== id) {
      throw new HttpError(409, 'RUC_TAKEN', 'Ya existe un cliente con ese RUC / Cédula.');
    }
  }

  try {
    // Actualización atómica con bloqueo optimista: solo aplica si la versión coincide.
    const result = await prisma.cliente.updateMany({
      where: { id, version: input.version },
      data: {
        ...toWriteData(input),
        ...(input.estado ? { estado: input.estado } : {}),
        updatedById: actorId,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new HttpError(
        409,
        'VERSION_CONFLICT',
        'El registro fue modificado por otra persona. Recarga e intenta de nuevo.',
      );
    }
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HttpError(409, 'RUC_TAKEN', 'Ya existe un cliente con ese RUC / Cédula.');
    }
    throw err;
  }

  const updated = await getCliente(id);
  broadcast('updated', { id });
  return updated;
}

export async function updateClienteEstado(
  id: string,
  input: ClienteEstadoUpdateInput,
  actorId: string | null,
): Promise<ClienteDto> {
  const existing = await prisma.cliente.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'CLIENTE_NOT_FOUND', 'Cliente no encontrado.');

  const result = await prisma.cliente.updateMany({
    where: { id, version: input.version },
    data: { estado: input.estado, updatedById: actorId, version: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new HttpError(
      409,
      'VERSION_CONFLICT',
      'El registro fue modificado por otra persona. Recarga e intenta de nuevo.',
    );
  }

  const updated = await getCliente(id);
  broadcast('updated', { id });
  return updated;
}

export async function deleteCliente(id: string): Promise<void> {
  try {
    await prisma.cliente.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'CLIENTE_NOT_FOUND', 'Cliente no encontrado.');
    }
    throw err;
  }
  broadcast('deleted', { id });
}
