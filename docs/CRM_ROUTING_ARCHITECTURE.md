# ALVA CRM · Arquitectura de rutas canónicas

Esta estructura se inició en Fase B y queda tenant-aware en Fase C.

## Superficies del producto

| Ruta | Responsabilidad | Fuente |
| --- | --- | --- |
| `/` | Landing comercial de ALVA CRM | `index.html` + `site/` |
| `/demo/` | Demostración aislada, sin datos reales | `demo/` |
| `/admin/` | ALVA CRM Control Center | `admin/` |
| `/app/<tenant>/` | Runtime CRM compartido por organización | `app/index.html` vía rewrite |
| `/app/<tenant>/colaboradores/` | Portal de Colaboradores compartido | `runtime/colaboradores.html` vía rewrite |

## Alias de Casillas & Asociados

- `/C&ACRM/` → tenant `casillas-asociados`, superficie CRM.
- `/C&ACRM/Colaboradores/` → tenant `casillas-asociados`, Portal de Colaboradores.

Los alias son rewrites internos: la URL amigable permanece visible y no crea una copia del producto.

## Resolución de tenant

`tenant-routing.js` es la capa común de URL. Reconoce:

1. `/app/<tenant>/`.
2. `/app/<tenant>/colaboradores/`.
3. Alias `/C&ACRM/` y `/C&ACRM/Colaboradores/`.
4. Acceso histórico `?tenant=<slug>` como compatibilidad temporal.
5. El prefijo `/CyA_CRM/` cuando el host es GitHub Pages.

El CRM usa el slug resuelto para branding previo al login y vuelve a comprobarlo contra la organización del usuario autenticado. Una cuenta de otra organización no puede entrar a través de un enlace tenant distinto.

El Portal de Colaboradores envía también el slug esperado a sus Edge Functions. `collaborator-portal` y `collaborator-discarded` verifican que la cuenta pertenezca a esa organización antes de usar service_role.

## Cloudflare Pages

`_worker.js` es el router efectivo de Cloudflare Pages. Intercepta las rutas tenant-aware y sirve internamente `/app/index.html` o `/runtime/colaboradores.html` sin cambiar la URL visible.

`_redirects` se conserva como respaldo/documentación de intención, pero durante las pruebas HTTP reales del preview Cloudflare el fallback del proyecto devolvía la landing para rutas profundas; por eso el worker explícito se considera la fuente de routing.

Las reglas específicas de colaboradores se resuelven antes que las rutas CRM genéricas.

Los assets del CRM y del Portal utilizan rutas absolutas para que una ruta profunda no intente cargar CSS/JS debajo del slug del tenant.

## Generación de enlaces

Control Center Preview genera:

- C&A CRM: `/C&ACRM/`.
- C&A Colaboradores: `/C&ACRM/Colaboradores/`.
- Otros tenants: `/app/<slug>/`.
- Otros Portales: `/app/<slug>/colaboradores/`.

La versión futura de `platform-admin` en esta rama ya está preparada para devolver esas URLs. Ese cambio no se desplegará en producción hasta el corte, porque `main` aún no publica las rutas nuevas.

## Compatibilidad temporal

- `platform/site/` permanece disponible en la rama.
- `platform/admin/` permanece disponible en la rama.
- `colaborador/` sigue siendo el acceso histórico del Portal C&A.
- `?tenant=<slug>` continúa interpretándose.
- No se han eliminado accesos GitHub Pages.

La limpieza y redirecciones definitivas corresponden a Fase E.

## Principios de seguridad

1. La URL selecciona contexto, pero la identidad autenticada es la autoridad.
2. El tenant solicitado debe coincidir con la organización de la cuenta.
3. RLS y entitlements continúan siendo la capa de aislamiento de datos.
4. Las funciones service_role validan tenant y módulo antes de operar.
5. Ninguna ruta nueva implica copiar datos, tablas o repositorios.

## Fases siguientes

- Fase D: nuevo diseño Navy/Dorado del Portal de Colaboradores.
- Fase E: compatibilidad y redirecciones históricas.
- Fase F: registrar URLs finales dentro de ALVA Core.
- Fase G: QA completo y corte de producción.

## Ruta histórica de Colaboradores

`/colaborador/` ya no es el runtime del Portal. Se conserva únicamente como puente de compatibilidad hacia `/C&ACRM/Colaboradores/`. El runtime funcional vive en `runtime/colaboradores.html` y solo es servido internamente por el router de Cloudflare.
