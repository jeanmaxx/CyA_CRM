# C&A CRM · Android

Primera base Android del CRM de Casillas & Asociados.

## Arquitectura

- Capacitor 8.
- Package ID: `com.alvasd.cya.crm`.
- Nombre de aplicación: `C&A CRM`.
- El WebView abre el tenant productivo: `https://crm-alvasd.pages.dev/app/casillas-asociados/`.
- El proyecto Android nativo se genera durante CI y no se guarda en el repositorio.
- El icono/splash se generan a partir del activo maestro `assets/brand/cya-logo-dark.svg` sobre fondo navy.

## APK de prueba

El workflow `.github/workflows/android-apk.yml` genera una APK `debug` instalable para pruebas internas y la publica como artefacto de GitHub Actions.

Esta APK no es todavía la versión final de distribución. La firma release, biometría, notificaciones push, integración RENAPO y puente nativo de compartir/WhatsApp se incorporarán en las siguientes fases.

El envío de WhatsApp siempre debe terminar con una acción humana; la aplicación no enviará mensajes automáticamente.
