# ALVA CRM · Arquitectura de rutas canónicas

Esta estructura se introduce en la Fase B de la migración del producto ALVA CRM.

## Superficies canónicas

| Ruta | Responsabilidad | Fuente |
| --- | --- | --- |
| `/` | Landing comercial de ALVA CRM | `index.html` + `site/` |
| `/demo/` | Demostración aislada, sin datos reales | `demo/` |
| `/admin/` | ALVA CRM Control Center | `admin/` |
| `/app/` | Runtime compartido multiempresa | `app/` |

## Reglas

1. La raíz del producto nunca vuelve a ser el CRM operativo de un cliente.
2. `/admin/` administra únicamente ALVA CRM; no sustituye `alva-sd.pages.dev/admin/`.
3. `/app/` contiene el shell operativo compartido. Los tenants y alias se resolverán en Fase C.
4. `/demo/` no puede utilizar credenciales, tablas ni información de producción.
5. `platform/site/`, `platform/admin/` y `colaborador/` se conservan temporalmente como fuentes históricas/compatibilidad. Las redirecciones se resolverán en Fase E.
6. La lógica CRM (app-core, cloud adapter, workflows, contratos y vendor) sigue siendo única en la raíz del repositorio; `app/index.html` la consume con URLs absolutas para evitar duplicación.
7. Ninguna modificación de esta fase requiere migración de datos en Supabase.

## Fases siguientes

- Fase C: resolver tenant por URL y crear alias `/C&ACRM/`.
- Fase D: migrar Portal de Colaboradores a diseño Navy/Dorado y ruta tenant-aware.
- Fase E: compatibilidad/redirecciones históricas.
- Fase F: registrar URLs finales dentro de ALVA Core.
- Fase G: QA y corte de producción.
