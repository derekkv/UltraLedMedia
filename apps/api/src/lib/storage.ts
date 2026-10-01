import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, unlink, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join, resolve, basename } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { env } from '../config/env';

/** Raíz absoluta donde se guardan los adjuntos (resuelta desde el cwd del proceso). */
const UPLOADS_ROOT = resolve(process.cwd(), env.UPLOADS_DIR);

/** Subcarpeta por cliente: UPLOADS_ROOT/clientes/<clienteId>. */
function clienteDir(clienteId: string): string {
  return join(UPLOADS_ROOT, 'clientes', clienteId);
}

/** Ruta absoluta de un archivo almacenado, garantizando que no escape de la carpeta del cliente. */
export function resolveStoredPath(clienteId: string, storedName: string): string {
  // Evita path traversal: solo se permite el nombre base del archivo.
  const safeName = basename(storedName);
  return join(clienteDir(clienteId), safeName);
}

/** Genera un nombre único en disco preservando la extensión original (en minúsculas). */
export function buildStoredName(originalName: string): string {
  const ext = extname(originalName).toLowerCase().slice(0, 12);
  return `${randomUUID()}${ext}`;
}

/**
 * Persiste un stream de subida en disco. Devuelve el tamaño real escrito.
 * Crea la carpeta del cliente si no existe.
 */
export async function saveStream(
  clienteId: string,
  storedName: string,
  stream: Readable,
): Promise<number> {
  await mkdir(clienteDir(clienteId), { recursive: true });
  const dest = resolveStoredPath(clienteId, storedName);
  let bytes = 0;
  stream.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
  });
  await pipeline(stream, createWriteStream(dest));
  return bytes;
}

/** Abre un stream de lectura de un archivo almacenado. */
export function readStoredStream(clienteId: string, storedName: string): Readable {
  return createReadStream(resolveStoredPath(clienteId, storedName));
}

/** ¿Existe el archivo en disco? */
export async function storedExists(clienteId: string, storedName: string): Promise<boolean> {
  try {
    await stat(resolveStoredPath(clienteId, storedName));
    return true;
  } catch {
    return false;
  }
}

/** Elimina un archivo del disco (silencioso si ya no existe). */
export async function deleteStored(clienteId: string, storedName: string): Promise<void> {
  try {
    await unlink(resolveStoredPath(clienteId, storedName));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

/** Elimina la carpeta completa de un cliente (silencioso si no existe). */
export async function deleteClienteDir(clienteId: string): Promise<void> {
  await rm(clienteDir(clienteId), { recursive: true, force: true });
}
