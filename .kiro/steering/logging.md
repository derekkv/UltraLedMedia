# Auditoría / Logs — regla obligatoria

Esta regla aplica a **todo** el backend (`apps/api`) y a cualquier módulo nuevo.

## Regla de oro

**TODA** operación que cree, edite, elimine o cambie el estado de un dato
persistente **DEBE** registrar un log de auditoría con
`audit(request, { ... })` (`apps/api/src/security/audit.ts`).

Si agregas una mutación (POST/PATCH/PUT/DELETE) y no la auditas, la tarea
**no está terminada**. Las lecturas (GET) normalmente no se auditan.

## Qué registrar (mínimo)

- `action`: verbo canónico `"<ENTIDAD>_<VERBO>"` en mayúsculas.
  Ejemplos: `CLIENTE_CREATED`, `CLIENTE_UPDATED`, `CLIENTE_DELETED`,
  `CLIENTE_ESTADO_CHANGED`, `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`.
- `entity`: nombre lógico (`"cliente"`, `"user"`, …) y `entityId`.
- `summary`: frase legible en español de lo que ocurrió.
- Alta/borrado → `snapshot` del registro (usar `auditSnapshot()`; nunca secretos).
- Edición → `changes` con el diff (`diffObjects(before, after)`).

El actor (id/email/nombre), IP, user-agent y fecha/hora se agregan solos.

## Patrón

```ts
// UPDATE con diff
const before = await getCosa(id);
const after = await updateCosa(id, body, actorId);
await audit(request, {
  action: 'COSA_UPDATED',
  entity: 'cosa',
  entityId: id,
  summary: `Editó "${after.nombre}".`,
  changes: diffObjects(before, after),
});
```

## Nunca

- No guardar contraseñas, hashes ni tokens en el log (ya se filtran por nombre,
  pero no los pases explícitamente).
- No dejar que un fallo de auditoría rompa la operación (`audit()` no lanza).

La estructura completa del log, con ejemplos por tipo de acción, está
documentada en el encabezado de `apps/api/src/security/audit.ts`. Léela antes
de añadir logs nuevos y mantén el mismo formato.
