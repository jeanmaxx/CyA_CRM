# Informe de regresión de Prospectos — 13/11/2026
## Hallazgo comprobado
- El PR #94 introdujo dos secuencias de caracteres literales `\\n` en `app-meta-leads-workflow.js`, inmediatamente antes de `window.cyaMetaHumanQuestions=metaQuestionsHtml` y `function fillQuestionnaireTab(l)`.
- El archivo completo era **sintácticamente inválido** (error `SyntaxError: Unexpected token 'function'`); la versión anterior del PR #93 compila correctamente.
- Esto impide ejecutar el módulo Meta. El expediente híbrido desapareció de la vista real del usuario; la relación exacta en cadena se comprobará mediante su loader y prueba end-to-end, pero este error basta para considerar la publicación PR #94 rota.
- El CI anterior estaba verde porque probaba fragmentos extraídos del código Meta y la interfaz híbrida en una página sintética, sin compilar ni cargar todo el módulo Meta real. Fue un falso positivo de cobertura.
## Acción de recuperación
- Restauración **del árbol completo de PR #93** como base, preservando los datos y sin cambios a Supabase, con un nuevo commit de reversión en la historia de Git.
- Excepciones deliberadas sobre el árbol antiguo: exclusivamente parámetros de caché nuevos para recargar JS/CSS y una prueba de sintaxis de la cadena de scripts cargados desde la aplicación.
- Se conserva respaldo de la versión defectuosa: `backup/main-regresion-prospecto-20261113`.
- No avanzar a Clientes ni reeditar diseños mientras no se confirme la carga de la versión híbrida restaurada en el sitio real.
## Verificación obligatoria
- [ ] Pruebas de sintaxis de módulos Meta, híbridos y cargadores.
- [ ] Suite de regresión general sin errores.
- [ ] Navegador Chromium sobre cuatro vistas sintéticas.
- [ ] Fusionar reversión a main tras las pruebas anteriores.
- [ ] Confirmar carga del expediente real en Cloudflare (requiere acceso a sitio desde navegador autenticado).
