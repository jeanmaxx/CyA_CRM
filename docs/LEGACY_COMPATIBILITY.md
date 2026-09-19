# ALVA CRM · Compatibilidad de rutas históricas

Fase E de la migración estructural.

## Objetivo

Mantener funcionales los accesos históricos mientras ALVA CRM adopta sus rutas canónicas. Las rutas antiguas no se consideran parte permanente de la arquitectura; funcionan como puentes hacia la estructura definitiva.

## Cloudflare Pages

`_worker.js` es la fuente efectiva de routing y compatibilidad.

| Ruta histórica | Destino canónico | Tipo |
| --- | --- | --- |
| `/platform/site/` | `/` | 308 |
| `/platform/admin/` | `/admin/` | 308 |
| `/colaborador/` | `/C&ACRM/Colaboradores/` | 308 |
| `/?tenant=casillas-asociados` | `/C&ACRM/` | 308 |
| `/?tenant=<slug>` | `/app/<slug>/` | 308 |

Los parámetros distintos de `tenant` se conservan.

Los assets internos de `/colaborador/` y `/platform/admin/` no se redirigen. Solo los documentos históricos de entrada cambian de ruta.

## Portal de Colaboradores

La ruta histórica `/colaborador/` dejó de ser el runtime real.

- Entrada histórica: `colaborador/index.html`.
- Runtime funcional: `runtime/colaboradores.html`.
- Ruta pública canónica: `/app/<tenant>/colaboradores/`.
- Alias C&A: `/C&ACRM/Colaboradores/`.

Esta separación evita loops por normalización automática de `index.html` en Cloudflare.

## GitHub Pages

GitHub Pages continúa siendo compatible para los usuarios que todavía conservan enlaces del repositorio.

`github-pages-bridge.js` solo actúa cuando el hostname termina en `github.io`.

| GitHub Pages histórico | Nuevo destino |
| --- | --- |
| `/CyA_CRM/` | `https://crm-alvasd.pages.dev/C&ACRM/` |
| `/CyA_CRM/?tenant=casillas-asociados` | `.../C&ACRM/` |
| `/CyA_CRM/?tenant=<slug>` | `.../app/<slug>/` |
| `/CyA_CRM/colaborador/` | `.../C&ACRM/Colaboradores/` |
| `/CyA_CRM/platform/site/` | `https://crm-alvasd.pages.dev/` |
| `/CyA_CRM/platform/admin/` | `.../admin/` |
| `/CyA_CRM/admin/` | `.../admin/` |
| `/CyA_CRM/demo/` | `.../demo/` |
| `/CyA_CRM/C&ACRM/` | conserva la ruta en el dominio CRM |
| `/CyA_CRM/app/<tenant>/` | conserva la ruta en el dominio CRM |

La raíz histórica de GitHub Pages se redirige deliberadamente a C&A CRM porque ese era el acceso operativo utilizado por el equipo antes de la migración.

## Rutas profundas en GitHub Pages

GitHub Pages no ofrece rewrites equivalentes al worker de Cloudflare. Por eso `404.html` carga el puente y transfiere rutas profundas como:

- `/CyA_CRM/C&ACRM/`
- `/CyA_CRM/C&ACRM/Colaboradores/`
- `/CyA_CRM/app/<tenant>/`

al dominio oficial de ALVA CRM.

## Política de transición

1. Durante Fases E–G las rutas históricas permanecen soportadas.
2. No se eliminan los archivos heredados antes del corte final.
3. GitHub Pages pasa de ser aplicación principal a puente de compatibilidad.
4. Las URLs que deben compartirse desde Control Center son únicamente las canónicas.
5. Las futuras empresas nunca recibirán enlaces `?tenant=`.
6. Después del periodo de transición podrá evaluarse retirar las rutas históricas, manteniendo redirecciones de larga duración cuando sea conveniente.
