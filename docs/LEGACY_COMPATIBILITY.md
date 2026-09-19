# Compatibilidad de rutas históricas

La migración estructural de ALVA CRM terminó en Fase G. Desde la depuración post-migración, las rutas históricas **ya no mantienen copias de la aplicación**: solo existen como redirecciones hacia las superficies canónicas.

## Rutas canónicas

- Landing: `/`
- Demo: `/demo/`
- CRM Control Center: `/admin/`
- Tenant CRM: `/app/<tenant>/`
- Portal de Colaboradores: `/app/<tenant>/colaboradores/`
- Alias C&A: `/C&ACRM/`
- Alias C&A Colaboradores: `/C&ACRM/Colaboradores/`

## Compatibilidad conservada

Cloudflare mantiene redirección 308 para accesos históricos:

- `/platform/site/*` → `/`
- `/platform/admin/*` → `/admin/`
- `/colaborador/` y `/colaborador/index.html` → `/C&ACRM/Colaboradores/`
- `/?tenant=<slug>` → `/app/<slug>/` o alias C&A

GitHub Pages conserva `github-pages-bridge.js` únicamente como puente hacia `https://crm-alvasd.pages.dev`.

Los archivos JS/CSS bajo `/colaborador/` siguen activos porque forman parte del runtime actual del Portal. No deben redirigirse.

## Regla de mantenimiento

No volver a crear interfaces dentro de `platform/site/`, `platform/admin/` ni `colaborador/index.html`. Toda evolución debe hacerse sobre las superficies canónicas.
