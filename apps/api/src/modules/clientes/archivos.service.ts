import { Prisma } from '@prisma/client';
import type { Readable } from 'node:stream';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { registry } from '../../ws/registry';
import {
  buildStoredName,
  deleteStored,
  readStoredStream,
  saveStream,
  storedExists,
} from '../../lib/storage';

const MODULE = 'VENTA';

/** DTO público de un archivo adjunto. */
export interface ArchivoDto {
  id: string;
  clienteId: string;
  nombre: string;
  mimeType: string;
  tamano: number;
  createdAt: string;
}

type ArchivoRow = Prisma.ClienteArchivoGetPayload<Record<string, never>>;

/** Tipos MIME permitidos (imágenes, video, audio, PDF, ofimática, texto, comprimidos). */
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]);

function isAllowedMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return ALLOWED_MIME_PREFIXES.some((p) => m.startsWith(p)) || ALLOWED_MIME_EXACT.has(m);
}

function toDto(a: ArchivoRow): ArchivoDto {
  return {
    id: a.id,
    clienteId: a.clienteId,
    nombre: a.nombre,
    mimeType: a.mimeType,
    tamano: a.tamano,
    createdAt: a.createdAt.toISOString(),
  };
}

function broadcast(clienteId: string): void {
  // Reutiliza el canal de clientes: el detalle refresca sus adjuntos.
  registry.broadcastToModule(MODULE, { type: 'cliente.updated', payload: { id: clienteId } });
}

async function assertClienteExists(clienteId: string): Promise<void> {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
  if (!cliente) throw new HttpError(404, 'CLIENTE_NOT_FOUND', 'Cliente no encontrado.');
}

/** Lista los adjuntos de un cliente (más recientes primero). */
export async function listArchivos(clienteId: string): Promise<ArchivoDto[]> {
  await assertClienteExists(clienteId);
  const rows = await prisma.clienteArchivo.findMany({
    where: { clienteId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
}

/**
 * Guarda un archivo subido (stream multipart) para un cliente.
 * Valida tipo y que no quede truncado por exceder el límite de tamaño.
 */
export async function createArchivo(
  clienteId: string,
  part: { filename: string; mimetype: string; file: Readable },
  actorId: string | null,
): Promise<ArchivoDto> {
  await assertClienteExists(clienteId);

  const nombre = (part.filename || 'archivo').slice(0, 255);
  const mimeType = (part.mimetype || 'application/octet-stream').slice(0, 150);

  if (!isAllowedMime(mimeType)) {
    // Drena el stream para no dejar la conexión colgada.
    part.file.resume();
    throw new HttpError(415, 'TIPO_NO_PERMITIDO', `Tipo de archivo no permitido: ${mimeType}.`);
  }

  const storedName = buildStoredName(nombre);
  const tamano = await saveStream(clienteId, storedName, part.file);

  // @fastify/multipart marca `truncated` si se superó el límite de tamaño.
  const truncated = (part.file as Readable & { truncated?: boolean }).truncated;
  if (truncated) {
    await deleteStored(clienteId, storedName);
    throw new HttpError(413, 'ARCHIVO_MUY_GRANDE', 'El archivo supera el tamaño máximo permitido.');
  }

  const row = await prisma.clienteArchivo.create({
    data: { clienteId, nombre, storedName, mimeType, tamano, createdById: actorId },
  });

  broadcast(clienteId);
  return toDto(row);
}

/** Devuelve los metadatos de un adjunto y su stream de lectura (para descarga/preview). */
export async function getArchivoDownload(
  clienteId: string,
  archivoId: string,
): Promise<{ meta: ArchivoDto; stream: Readable; storedName: string }> {
  const row = await prisma.clienteArchivo.findUnique({ where: { id: archivoId } });
  if (!row || row.clienteId !== clienteId) {
    throw new HttpError(404, 'ARCHIVO_NOT_FOUND', 'Archivo no encontrado.');
  }
  const exists = await storedExists(clienteId, row.storedName);
  if (!exists) {
    throw new HttpError(404, 'ARCHIVO_NOT_FOUND', 'El archivo ya no está disponible en el servidor.');
  }
  return { meta: toDto(row), stream: readStoredStream(clienteId, row.storedName), storedName: row.storedName };
}

/** Elimina un adjunto (registro + binario en disco). Devuelve el DTO eliminado. */
export async function deleteArchivo(clienteId: string, archivoId: string): Promise<ArchivoDto> {
  const row = await prisma.clienteArchivo.findUnique({ where: { id: archivoId } });
  if (!row || row.clienteId !== clienteId) {
    throw new HttpError(404, 'ARCHIVO_NOT_FOUND', 'Archivo no encontrado.');
  }
  await prisma.clienteArchivo.delete({ where: { id: archivoId } });
  await deleteStored(clienteId, row.storedName);
  broadcast(clienteId);
  return toDto(row);
}
