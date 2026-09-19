# ALVA CRM · Estándar visual del Portal de Colaboradores

Fase D de la migración multiempresa.

## Objetivo

El Portal de Colaboradores comparte el lenguaje visual del ALVA CRM Control Center sin compartir su lógica ni sus permisos. La interfaz debe sentirse como parte del mismo producto, manteniendo la identidad de la empresa cliente y la firma ALVA como proveedor tecnológico.

## Tokens base

- Fondo principal: `#0d1118`
- Sidebar: `#111722`
- Superficies: `#151c27`
- Superficie secundaria: `#1a2331`
- Campos / superficie profunda: `#0e1520`
- Bordes: `#273142`
- Texto: `#f5f7fa`
- Texto secundario: `#8795a8`
- Acento ALVA: `#ffc20e`
- Éxito: `#53d6a2`
- Advertencia: `#ffb454`
- Error: `#ff6b75`

Tipografía:
- Inter para interfaz.
- Manrope para títulos y métricas.

## Jerarquía

### Login
Tarjeta centrada, superficie oscura, borde fino, marca del tenant arriba y firma ALVA abajo. Los inputs usan fondo profundo y foco dorado.

### Desktop
Sidebar fija de 238 px. Navegación activa con fondo dorado transparente y barra interior dorada, igual al Control Center.

Topbar de 86 px, sticky y con blur. El estado de sincronización usa indicador verde.

### Dashboard
Hero con borde/acento dorado, KPIs en superficies independientes y paneles con bordes `#273142`.

### Prospectos y clientes
Las columnas y tarjetas utilizan superficies del mismo sistema. Los estados conservan semántica:
- dorado: contexto/activo;
- verde: completado/elegible;
- ámbar: seguimiento;
- rojo: descartado/error.

### Guía, estadísticas y finanzas
No crean estilos propios de producto. Reutilizan superficies, bordes y tipografía del sistema.

## Branding multiempresa

`phase-d-branding.js` resuelve el tenant mediante `ALVA_TENANT_ROUTE` y consulta `platform-branding`.

Actualiza:
- nombre de la organización;
- logo del tenant;
- título del documento;
- texto del login.

La firma de ALVA permanece separada del branding del cliente.

## Responsive

- > 980 px: sidebar completa.
- 781–980 px: sidebar compacta de iconos.
- <= 780 px: sidebar oculta y navegación inferior.
- <= 430 px: optimización de login, KPIs y controles superiores.

## Compatibilidad funcional

Fase D no cambia IDs ni valores `data-page` del Portal. Esto protege:
- login;
- navegación;
- formularios;
- modales;
- prospectos;
- clientes;
- guía;
- estadísticas;
- finanzas;
- descartados;
- elegibilidad.

La capa principal vive en `colaborador/alva-phase-d.css`. `phase-d-finalize.js` vuelve a colocarla al final de la cascada después de los módulos que inyectan estilos dinámicamente.

## Regla de crecimiento

Ningún nuevo módulo del Portal debe introducir una paleta nueva. Debe usar los tokens anteriores y, si necesita estados particulares, extender únicamente la semántica de éxito/advertencia/error.
