# C&A CRM Legacy — diagnóstico aislado para RCA Viking Pro

Prototipo Android nativo **sin conexión de red** y sin credenciales. No contiene un CRM funcional, no integra Supabase y no modifica el CRM de producción. Su objetivo es verificar instalación API 21 y renderizado HTML básico en el dispositivo.

## Compilación
Abrir la carpeta `legacy-android5` en Android Studio con JDK 17 y Android SDK 35; compilar el módulo `app` con Gradle 8.7+ compatible con Android Gradle Plugin 8.6.1. El APK de depuración queda normalmente en `app/build/outputs/apk/debug/app-debug.apk`.

## Restricciones
- `minSdk 21` (Android 5.0); paquete independiente `mx.alvasd.cya.legacydiagnostic`.
- No se solicita permiso INTERNET; no puede consultar clientes ni autenticar usuarios.
- No hay credenciales, claves ni datos personales en el paquete.
- Este proyecto no incorpora un motor Chromium independiente. Un WebView del sistema puede ser demasiado antiguo para el CRM moderno.
- Compilar e instalar **no equivale** a validar la seguridad de un Android sin soporte. No usar para datos reales.

## Siguientes verificaciones
1. Instalar en RCA RCT6303W87DK y confirmar pantalla de diagnóstico.
2. Comprobar versión de Android System WebView en ajustes del dispositivo.
3. Evaluar motor compatible y mantenido para ARM de 32 bits antes de conectar cualquier servicio.
4. Solo si supera pruebas de seguridad, considerar una aplicación de producción separada.

No fusionar esta rama a main.
