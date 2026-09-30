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
import {
  createCliente,
  deleteCliente,
  getCliente,
  listClientes,
  updateCliente,
  updateClienteEstado,
} from './service';

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
};
