import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  clienteCreateSchema,
  clienteUpdateSchema,
  clienteEstadoUpdateSchema,
  CLIENTE_ESTADOS,
  GRUPOS_COMERCIALES,
  MATERIALES_PUBLICIDAD,
  DURACIONES_SPOT,
  PLANES_CONTRATADOS,
  MODALIDADES_PAGO,
  FACTURA_CON,
} from '@ultraled/shared';
import { requireAuth, requirePermission } from '../../security/rbac';
import { audit, auditSnapshot, diffObjects } from '../../security/audit';
import { HttpError } from '../../lib/http-error';
import {
  createCliente,
  deleteCliente,
  getCliente,
  listClientes,
  updateCliente,
  updateClienteEstado,
} from './service';
import {
  createArchivo,
  deleteArchivo,
  getArchivoDownload,
  listArchivos,
} from './archivos.service';

/** Esquema del DTO de cliente para validación/serialización de respuestas. */
const clienteDtoSchema = z.object({
  id: z.string(),
  razonSocial: z.string(),
  rucCedula: z.string(),
  representanteLegal: z.string().nullable(),
  actividadNegocio: z.string().nullable(),
  grupoComercial: z.enum(GRUPOS_COMERCIALES),
  grupoComercialOtro: z.string().nullable(),
  direccionLocal: z.string().nullable(),
  facebook: z.string().nullable(),
  instagram: z.string().nullable(),
  tiktok: z.string().nullable(),
  personaContacto: z.string().nullable(),
  telefonoWhatsapp: z.string().nullable(),
  emailAccesoEnVivo: z.string().nullable(),
  queDeseaPublicitar: z.string().nullable(),
  tieneMaterial: z.enum(MATERIALES_PUBLICIDAD),
  costoDisenoExtra: z.number().nullable(),
  textoPantalla: z.string().nullable(),
  duracionSpot: z.enum(DURACIONES_SPOT),
  pantallasAsignadas: z.string().nullable(),
  ubicacionPantallas: z.string().nullable(),
  fechaInicio: z.string(),
  fechaVencimiento: z.string(),
  planContratado: z.enum(PLANES_CONTRATADOS),
  valorPlan: z.number(),
  reproduccionesDiarias: z.number(),
  diaPagoMensual: z.number(),
  modalidadPago: z.enum(MODALIDADES_PAGO),
  facturaCon: z.enum(FACTURA_CON),
  notas: z.string().nullable(),
  estado: z.enum(CLIENTE_ESTADOS),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** DTO de un archivo adjunto de cliente. */
const archivoDtoSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  nombre: z.string(),
  mimeType: z.string(),
  tamano: z.number(),
  createdAt: z.string(),
});

export const clientesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/clientes',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'READ')],
      schema: {
        tags: ['clientes'],
        summary: 'Listar clientes (paginación por cursor)',
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          q: z.string().max(120).optional(),
          estado: z.enum(CLIENTE_ESTADOS).optional(),
        }),
        response: {
          200: z.object({
            items: z.array(clienteDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
    async (request) => {
      return listClientes({
        cursor: request.query.cursor,
        limit: request.query.limit,
        q: request.query.q,
        estado: request.query.estado,
      });
    },
  );

  app.get(
    '/clientes/:id',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'READ')],
      schema: {
        tags: ['clientes'],
        summary: 'Detalle de cliente',
        params: z.object({ id: z.uuid() }),
        response: { 200: clienteDtoSchema },
      },
    },
    async (request) => {
      return getCliente(request.params.id);
    },
  );

  app.post(
    '/clientes',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'CREATE'), app.csrfProtection],
      schema: {
        tags: ['clientes'],
        summary: 'Registrar cliente (Formulario Cliente Ultra Led)',
        body: clienteCreateSchema,
        response: { 201: clienteDtoSchema },
      },
    },
    async (request, reply) => {
      const cliente = await createCliente(request.body, request.currentUser?.id ?? null);
      await audit(request, {
        action: 'CLIENTE_CREATED',
        entity: 'cliente',
        entityId: cliente.id,
        summary: `Creó el cliente "${cliente.razonSocial}" (RUC/CI ${cliente.rucCedula}).`,
        snapshot: auditSnapshot({ ...cliente }),
      });
      return reply.status(201).send(cliente);
    },
  );

  app.patch(
    '/clientes/:id',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'UPDATE'), app.csrfProtection],
      schema: {
        tags: ['clientes'],
        summary: 'Editar cliente (reemplazo del formulario, con bloqueo optimista)',
        params: z.object({ id: z.uuid() }),
        body: clienteUpdateSchema,
        response: { 200: clienteDtoSchema },
      },
    },
    async (request, reply) => {
      const before = await getCliente(request.params.id);
      const cliente = await updateCliente(
        request.params.id,
        request.body,
        request.currentUser?.id ?? null,
      );
      await audit(request, {
        action: 'CLIENTE_UPDATED',
        entity: 'cliente',
        entityId: cliente.id,
        summary: `Editó el cliente "${cliente.razonSocial}".`,
        changes: diffObjects({ ...before }, { ...cliente }),
      });
      return reply.send(cliente);
    },
  );

  app.patch(
    '/clientes/:id/estado',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'UPDATE'), app.csrfProtection],
      schema: {
        tags: ['clientes'],
        summary: 'Cambiar estado del contrato (activar / pausar / cancelar)',
        params: z.object({ id: z.uuid() }),
        body: clienteEstadoUpdateSchema,
        response: { 200: clienteDtoSchema },
      },
    },
    async (request, reply) => {
      const before = await getCliente(request.params.id);
      const cliente = await updateClienteEstado(
        request.params.id,
        request.body,
        request.currentUser?.id ?? null,
      );
      await audit(request, {
        action: 'CLIENTE_ESTADO_CHANGED',
        entity: 'cliente',
        entityId: cliente.id,
        summary: `Cambió el estado de "${cliente.razonSocial}" de ${before.estado} a ${cliente.estado}.`,
        changes: { estado: { from: before.estado, to: cliente.estado } },
      });
      return reply.send(cliente);
    },
  );

  app.delete(
    '/clientes/:id',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'DELETE'), app.csrfProtection],
      schema: {
        tags: ['clientes'],
        summary: 'Eliminar cliente',
        params: z.object({ id: z.uuid() }),
      },
    },
    async (request, reply) => {
      const before = await getCliente(request.params.id);
      await deleteCliente(request.params.id);
      await audit(request, {
        action: 'CLIENTE_DELETED',
        entity: 'cliente',
        entityId: request.params.id,
        summary: `Eliminó el cliente "${before.razonSocial}" (RUC/CI ${before.rucCedula}).`,
        snapshot: auditSnapshot({ ...before }),
      });
      return reply.status(204).send();
    },
  );

  /* ------------------------------------------------------------------ */
  /* Archivos adjuntos del cliente (imágenes, videos, PDF, documentos)  */
  /* ------------------------------------------------------------------ */

  app.get(
    '/clientes/:id/archivos',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'READ')],
      schema: {
        tags: ['clientes'],
        summary: 'Listar archivos adjuntos del cliente',
        params: z.object({ id: z.uuid() }),
        response: { 200: z.object({ items: z.array(archivoDtoSchema) }) },
      },
    },
    async (request) => {
      const items = await listArchivos(request.params.id);
      return { items };
    },
  );

  app.post(
    '/clientes/:id/archivos',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'UPDATE'), app.csrfProtection],
      schema: {
        tags: ['clientes'],
        summary: 'Subir uno o más archivos adjuntos (multipart/form-data)',
        params: z.object({ id: z.uuid() }),
        consumes: ['multipart/form-data'],
        response: { 201: z.object({ items: z.array(archivoDtoSchema) }) },
      },
    },
    async (request, reply) => {
      const clienteId = request.params.id;
      const actorId = request.currentUser?.id ?? null;
      const parts = request.files();
      const created: Awaited<ReturnType<typeof createArchivo>>[] = [];

      for await (const part of parts) {
        const archivo = await createArchivo(
          clienteId,
          { filename: part.filename, mimetype: part.mimetype, file: part.file },
          actorId,
        );
        created.push(archivo);
        await audit(request, {
          action: 'CLIENTE_ARCHIVO_UPLOADED',
          entity: 'cliente_archivo',
          entityId: archivo.id,
          summary: `Adjuntó el archivo "${archivo.nombre}" al cliente.`,
          snapshot: auditSnapshot({ ...archivo }),
          extra: { clienteId },
        });
      }

      if (created.length === 0) {
        throw new HttpError(400, 'SIN_ARCHIVOS', 'No se recibió ningún archivo.');
      }

      return reply.status(201).send({ items: created });
    },
  );

  app.get(
    '/clientes/:id/archivos/:archivoId',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'READ')],
      schema: {
        tags: ['clientes'],
        summary: 'Descargar / previsualizar un archivo adjunto',
        params: z.object({ id: z.uuid(), archivoId: z.uuid() }),
        querystring: z.object({ download: z.coerce.boolean().optional() }),
      },
    },
    async (request, reply) => {
      const { meta, stream } = await getArchivoDownload(request.params.id, request.params.archivoId);
      const disposition = request.query.download ? 'attachment' : 'inline';
      const safeName = meta.nombre.replace(/["\\\r\n]/g, '_');
      reply.header('Content-Type', meta.mimeType);
      reply.header('Content-Length', meta.tamano);
      reply.header(
        'Content-Disposition',
        `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(meta.nombre)}`,
      );
      reply.header('Cache-Control', 'private, max-age=0, must-revalidate');
      return reply.send(stream);
    },
  );

  app.delete(
    '/clientes/:id/archivos/:archivoId',
    {
      preHandler: [requireAuth, requirePermission('VENTA', 'UPDATE'), app.csrfProtection],
      schema: {
        tags: ['clientes'],
        summary: 'Eliminar un archivo adjunto',
        params: z.object({ id: z.uuid(), archivoId: z.uuid() }),
      },
    },
    async (request, reply) => {
      const archivo = await deleteArchivo(request.params.id, request.params.archivoId);
      await audit(request, {
        action: 'CLIENTE_ARCHIVO_DELETED',
        entity: 'cliente_archivo',
        entityId: archivo.id,
        summary: `Eliminó el archivo "${archivo.nombre}" del cliente.`,
        snapshot: auditSnapshot({ ...archivo }),
        extra: { clienteId: request.params.id },
      });
      return reply.status(204).send();
    },
  );
};
