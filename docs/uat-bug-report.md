# UAT/BUG Report: adk-data-dude

Fecha: 2026-04-28  
Producto: `adk-data-dude`  
Tipo de revision: Product Management + UX + evidencia tecnica del repo  
Estado: Draft accionable para priorizacion

## Resumen Ejecutivo

`adk-data-dude` ya tiene una base prometedora: un agente ADK multi-agent, un frontend conversacional propio, visualizaciones, board de insights y un adaptador que normaliza eventos del backend. Sin embargo, la experiencia actual todavia no transmite suficiente confianza para un usuario de negocio. Los riesgos principales son latencia percibida, estados de progreso poco visibles, insights inconsistentes, SQL poco auditable y una interfaz que expone demasiada complejidad para el tipo de experiencia simple y cuidada que se busca.

La prioridad recomendada es tratar esto como un ciclo de estabilizacion UAT antes de seguir ampliando features. El foco debe ser: confianza en queries, feedback claro durante la espera, insights basados en datos reales y una experiencia tipo Apple: simple, predecible, con una accion principal clara por respuesta.

## Alcance UAT

### Usuarios objetivo

- Usuario de negocio que quiere hacer preguntas en lenguaje natural sin leer SQL.
- Analista que necesita validar, auditar y reutilizar la query generada.
- Product owner que quiere convertir respuestas utiles en insights guardables.

### Flujos a validar

- Pregunta simple de schema o metadatos.
- Pregunta numerica simple: count, total, top-N.
- Analisis con visualizacion.
- Deep analysis con recomendaciones.
- Error de SQL o tabla inexistente.
- Resultado vacio.
- Resultado lento.
- Guardado de insight en Board.
- Revision/auditoria de SQL generado.

### Supuestos

- Esta revision se basa en codigo y arquitectura, no en una sesion UAT completa en navegador contra BigQuery real.
- Los bugs marcados como "confirmado por codigo" tienen evidencia directa en el repo.
- Los bugs marcados como "requiere validacion UAT" deben reproducirse con el entorno local conectado a BigQuery.

## Hallazgos Priorizados

### P0-01: La latencia rompe la confianza porque no se muestran fases utiles

Severidad: P0  
Tipo: UX / Product / Performance percibida  
Estado: Confirmado por codigo

#### Evidencia

- `README.md` documenta que algunos flujos ADK+BigQuery pueden tardar `25s-60s`.
- `frontend/app/api/chat/route.ts` emite eventos SSE de tipo `phase` cuando detecta tool calls.
- `frontend/src/services/chatApi.ts` parsea esos eventos y llama `callbacks.onPhase`.
- `frontend/src/components/copilot/ChatPane.tsx` ignora esos eventos con `onPhase: () => {}`.
- `frontend/src/store/copilotStore.ts` ya tiene `statusPhase` y `phaseTrace`, pero el chat no los actualiza durante el streaming.

#### Actual

El usuario ve un typing indicator generico durante esperas largas. No sabe si el agente esta pensando, generando SQL, ejecutando BigQuery, creando visualizacion o atascado.

#### Esperado

La UI debe mostrar progreso real por fase:

- Thinking
- Generating SQL
- Querying BigQuery
- Building chart
- Summarizing result
- Done

#### Impacto

El usuario percibe que el producto es lento o inestable, aunque el backend siga trabajando correctamente. Esto degrada especialmente la experiencia tipo Apple, donde los estados intermedios deben ser claros y elegantes.

#### Criterios de aceptacion

- En cualquier respuesta que tarde mas de 3 segundos, el usuario ve una fase textual clara.
- Los eventos `phase` actualizan `statusPhase` en el store durante el streaming.
- La UI muestra `phaseTrace` o un stepper compacto para respuestas largas.
- P50 de primera senal visual de progreso: menor a 1 segundo.
- Si no hay cambios de fase durante mas de 20 segundos, la UI muestra un mensaje tipo "Still querying BigQuery..." en vez de solo animacion.

---

### P0-02: Falta una capa de auditoria de queries antes y despues de ejecutar SQL

Severidad: P0  
Tipo: Trust / Data Governance / Product Gap  
Estado: Confirmado por ausencia de funcionalidad

#### Evidencia

- `dashboard_agent/tools/bigquery.py` genera SQL con `bigquery_nl2sql` y lo guarda en `tool_context.state["sql_query"]`.
- `dashboard_agent/agents/analysis.py` y `dashboard_agent/agents/deep_analysis.py` ejecutan el SQL directamente despues de generarlo.
- `dashboard_agent/callbacks.py` guarda rows o error de `execute_sql`, pero no guarda metadatos de auditoria.
- `frontend/src/types/insight.ts` expone `sql_status`, pero no incluye auditoria: tablas usadas, bytes estimados, coste estimado, filtros, joins, row limit, duracion o job id.

#### Actual

El usuario puede ver SQL si esta disponible, pero no tiene una explicacion de riesgo/coste ni una auditoria simple de lo que se ejecuto.

#### Esperado

Cada respuesta analitica debe incluir una Query Audit Card con:

- SQL generado.
- Tablas usadas.
- Filtros clave.
- Joins detectados.
- Row limit.
- Estado de validacion.
- Bytes estimados o coste estimado cuando BigQuery lo permita.
- Duracion y job id si se ejecuto.
- Badge de complejidad: Simple, Moderate, Complex.

#### Impacto

Sin auditoria, el agente no es suficientemente confiable para usuarios que trabajan con datos sensibles, costes de BigQuery o decisiones de negocio. Tambien dificulta depurar errores de SQL.

#### Criterios de aceptacion

- Toda respuesta con SQL muestra un panel "Query Audit".
- Si la query no puede auditarse, la UI explica por que.
- Queries sin `LIMIT` o con limite excesivo se marcan como riesgo.
- Queries con joins multiples se marcan como complejas y muestran las tablas involucradas.
- El usuario puede copiar SQL y abrir/ver detalles de auditoria sin perder el contexto del chat.

---

### P1-01: La bombilla de insight/summary no aparece de forma predecible

Severidad: P1  
Tipo: UX Bug / Feature Reliability  
Estado: Confirmado por codigo

#### Evidencia

- `frontend/app/api/chat/route.ts` calcula `suggest_pin` solo si el response type es insight y hay al menos dos `key_points` o una `recommended_action`.
- `frontend/src/components/copilot/ChatPane.tsx` solo renderiza `InsightRecommendation` si existe `insight_summary`, el mensaje es el ultimo y `uiHints?.suggest_pin` es true.
- `frontend/src/components/copilot/InsightRecommendation.tsx` puede renderizar un resumen con cero key points, pero normalmente no llega a mostrarse por el gating anterior.

#### Actual

Puede existir un `insight_summary` util, pero la bombilla no aparece si no se cumplen las reglas de `suggest_pin`.

#### Esperado

La bombilla debe aparecer de forma deterministica cuando exista un insight accionable:

- Si hay `insight_summary`, mostrar "Key finding".
- Si hay `key_points`, mostrarlos.
- Si hay `recommended_actions`, mostrar CTA para guardar o profundizar.
- Si no hay insight accionable, no mostrar bombilla y registrar el motivo en metadata/UI hints.

#### Impacto

El usuario interpreta que la funcion "summary/insight" no funciona. Esto reduce el valor percibido del producto aunque el backend haya generado datos.

#### Criterios de aceptacion

- Cuando `insight_summary` no esta vacio, la bombilla aparece salvo que `pin_allowed=false`.
- `suggest_pin` considera `insight_summary` como senal suficiente.
- Si la bombilla no aparece, existe una razon explicita y testeable.
- UAT valida tres casos: summary only, summary + key points, summary + recommended actions.

---

### P1-02: Las recomendaciones pueden estar desconectadas de los datos reales

Severidad: P1  
Tipo: Agent Quality / Data Grounding  
Estado: Confirmado por codigo

#### Evidencia

- `dashboard_agent/tools/recommend.py` define `get_recommendations(question, query_result_summary, tool_context=None)`.
- `dashboard_agent/agents/deep_analysis.py` instruye al LLM a llamar `get_recommendations` con "a concise summary of the data results".
- `dashboard_agent/callbacks.py` ya guarda rows reales en `tool_context.state["bigquery_query_result"]` despues de `execute_sql`.
- Las reglas del proyecto y la practica recomendada de ADK favorecen `after_tool_callback -> tool_context.state -> next tool` para pasar datos estructurados entre tools.

#### Actual

El LLM resume los datos y pasa ese resumen a la tool de recomendaciones. Esto puede perder detalle, introducir sesgo o generar recomendaciones poco fieles a los resultados reales.

#### Esperado

`get_recommendations` debe leer internamente `bigquery_query_result` desde `tool_context.state` y generar insights basados en rows reales, no en un resumen provisto por el LLM.

#### Impacto

La parte de insights parece debil porque la tool no esta suficientemente grounded. Esto afecta directamente la promesa de "business advisor".

#### Criterios de aceptacion

- `get_recommendations` no requiere `query_result_summary` como argumento LLM-facing.
- La tool lee rows desde `tool_context.state`.
- Si no hay rows, devuelve un JSON estructurado con caveat claro.
- Las recomendaciones incluyen evidencia numerica concreta cuando los datos lo permiten.
- Se anade eval/UAT para verificar que las recomendaciones no contradicen rows.

---

### P1-03: La generacion de SQL es demasiado abierta y puede producir queries complejas

Severidad: P1  
Tipo: Product / Agent Behavior / Cost Risk  
Estado: Confirmado por codigo y requiere validacion UAT

#### Evidencia

- `dashboard_agent/tools/bigquery.py` usa `MAX_NUM_ROWS = 10000`.
- El prompt de `bigquery_nl2sql` pide una unica sentencia BigQuery, usar tablas del dataset y limitar filas, pero no pide la query mas simple posible.
- No hay complexity budget, dry run, estimacion de bytes, preferencia por agregaciones simples ni verificacion previa de joins.
- `quick_answer_agent` puede escribir SQL directamente en instrucciones, saltandose `bigquery_nl2sql`.

#### Actual

El agente puede generar SQL correcto pero demasiado complejo para la necesidad del usuario, aumentando latencia, coste y dificultad de auditoria.

#### Esperado

El agente debe optimizar por "simplest correct query":

- Usar agregaciones antes que rows detalladas cuando sea posible.
- Evitar joins si una tabla responde la pregunta.
- Usar limites conservadores para exploracion.
- Explicar en lenguaje simple por que eligio esos filtros y dimensiones.
- Escalar a queries complejas solo cuando el usuario lo pide o la pregunta lo exige.

#### Impacto

La experiencia se siente tecnica y pesada. Para una UX tipo Apple, el usuario debe sentir que el sistema reduce complejidad, no que la traslada a la interfaz.

#### Criterios de aceptacion

- Prompts simples generan SQL con una o pocas tablas.
- Top-N incluye `ORDER BY` y `LIMIT` razonable.
- Trends agregan por periodo y no devuelven rows crudas.
- El SQL audit marca queries complejas y sugiere simplificacion si aplica.
- UAT incluye comparacion entre query generada y query esperada para 10 prompts comunes.

---

### P1-04: Errores de chat se muestran como fallos tecnicos, no como recuperacion guiada

Severidad: P1  
Tipo: UX / Error Handling  
Estado: Confirmado parcialmente por codigo; requiere reproduccion UAT

#### Evidencia

- `frontend/src/services/chatApi.ts` devuelve mensajes como `Request failed: {status}`, texto de error o `Unknown error`.
- `frontend/src/components/copilot/ChatPane.tsx` muestra `Request failed: {lastError}` y un boton `Retry`.
- No hay clasificacion visible de errores: SQL error, backend unavailable, timeout, empty result, auth/config.

#### Actual

El usuario recibe errores genericos y un retry. No siempre entiende que fallo ni que puede hacer.

#### Esperado

Los errores deben ser humanos, especificos y accionables:

- "I couldn't reach BigQuery. Try again or check connection."
- "The generated SQL failed. Review the query or ask me to simplify it."
- "No rows matched these filters. Try a broader date range."
- "This took longer than expected. You can retry or simplify the question."

#### Impacto

Los errores de chat erosionan confianza y hacen que el usuario piense que el agente "se rompe" en vez de entender una limitacion recuperable.

#### Criterios de aceptacion

- Cada error tiene categoria, copy user-friendly y accion siguiente.
- El boton `Retry` conserva contexto.
- Para SQL error, se muestra el SQL y el error relevante en Query Audit.
- Para timeout, se sugiere simplificar o limitar la pregunta.
- El UAT valida al menos cuatro tipos de error.

---

### P2-01: El fallback de summary usa una superficie de modelo distinta

Severidad: P2  
Tipo: Reliability / Config Consistency  
Estado: Confirmado por codigo

#### Evidencia

- `frontend/app/api/chat/route.ts` importa `GoogleGenerativeAI` y usa `summarizeWithGemini`.
- `summarizeWithGemini` depende de `GOOGLE_API_KEY`.
- El backend ADK usa Vertex/Gemini via variables como `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `ROOT_AGENT_MODEL` y `NL2SQL_MODEL`.

#### Actual

El resumen fallback puede fallar silenciosamente si `GOOGLE_API_KEY` no existe, aunque el agente ADK principal este correctamente configurado con Vertex.

#### Esperado

El pipeline de summaries debe usar la misma estrategia de configuracion que el backend o degradar con un mensaje observable.

#### Impacto

Contribuye a la percepcion de que la bombilla o summaries "no funcionan".

#### Criterios de aceptacion

- Si el fallback de summary no esta configurado, se registra y expone una razon interna clara.
- No hay dependencia oculta de `GOOGLE_API_KEY` para una feature central sin documentacion.
- El summary fallback usa el mismo proveedor/config o se elimina a favor del pipeline ADK.

---

### P2-02: La jerarquia visual compite entre Chat, Preview, Insight y Board

Severidad: P2  
Tipo: UX / Information Architecture  
Estado: Requiere validacion UAT

#### Evidencia

- La UI tiene chat, inline artifact, insight recommendation, canvas/insight view y board.
- `frontend/src/store/copilotStore.ts` mantiene `currentInsight`, `mainMode`, `pinnedBoardItems`, `uiHints` y `phaseTrace`.
- `ChatPane.tsx` puede renderizar texto, inline artifact y bombilla en el mismo mensaje.

#### Actual

La experiencia puede sentirse potente pero cargada: el usuario no siempre sabe si debe leer el chat, abrir el insight, mirar el preview o guardar en board.

#### Esperado

Cada respuesta debe tener una jerarquia clara:

1. Answer: conclusion en lenguaje natural.
2. Evidence: tabla/chart compacto.
3. Audit: SQL y validacion.
4. Action: save, refine, ask follow-up.

#### Impacto

El producto se aleja de la experiencia Apple-like: simple, calmada, con una decision principal por pantalla.

#### Criterios de aceptacion

- Cada respuesta tiene una accion primaria visible.
- Las acciones secundarias no compiten con la lectura del resultado.
- Empty state muestra tres intenciones simples, no una lista tecnica.
- El usuario puede completar un flujo de pregunta -> insight -> guardar sin abrir paneles innecesarios.

## Recomendaciones UX/Product

### Principios para una experiencia tipo Apple

- Reducir la interfaz a una promesa clara: "Ask, understand, trust, save".
- Mostrar una sola accion principal por respuesta.
- Sustituir errores tecnicos por recuperacion guiada.
- Mostrar progreso con lenguaje humano y especifico.
- Hacer que el SQL sea auditable, pero no protagonista para usuarios no tecnicos.
- Convertir insights en tarjetas narrativas pequenas y elegantes, no en reportes largos.

### Cambios recomendados de copy

| Situacion | Copy actual probable | Copy recomendado |
| --- | --- | --- |
| Espera larga | Typing indicator | "Querying BigQuery..." |
| SQL complejo | SQL panel generico | "This query joins 3 tables and scans an estimated X MB." |
| Resultado vacio | Mensaje generico | "No rows matched this filter. Try a wider date range." |
| Insight guardable | "Pin insight" | "Save insight" |
| Error tecnico | "Request failed" | "I couldn't complete this query. Review SQL or try again." |

### Simplificacion de interfaz

- Empty state con tres opciones:
  - "Explore my data"
  - "Create a chart"
  - "Find opportunities"
- Respuesta estandar:
  - Headline
  - Key evidence
  - Optional chart/table
  - Query Audit
  - Save insight
- Board:
  - Guardar solo contenido curado: headline, evidencia, recomendacion, SQL audit link.

## Suite UAT Recomendada

### UAT-01: Schema discovery

Prompt: `What data do we have?`  
Esperado:

- Respuesta en menos de 8 segundos P50.
- Lista simple de tablas o categorias.
- Sin chart.
- Follow-up sugerido.

### UAT-02: Metrica simple

Prompt: `How many orders did we have last month?`  
Esperado:

- Respuesta concisa con numero.
- SQL disponible o auditable.
- Sin canvas automatico salvo que haya insight real.

### UAT-03: Top-N

Prompt: `Show me the top 10 products by revenue.`  
Esperado:

- Query con `ORDER BY` y `LIMIT 10`.
- Tabla/chart compacto.
- Query Audit visible.
- Fase `querying` mostrada durante ejecucion.

### UAT-04: Trend con visualizacion

Prompt: `Show monthly revenue trend for 2024.`  
Esperado:

- Chart lineal.
- SQL agregado por mes.
- Headline que explica tendencia.
- Insight guardable si hay hallazgo claro.

### UAT-05: Deep analysis con recomendaciones

Prompt: `Give me a full analysis of customer retention and recommended actions.`  
Esperado:

- Usa flujo deep analysis.
- Recomendaciones basadas en rows reales.
- Incluye evidence, caveat y next action.
- Bombilla aparece si hay summary o acciones.

### UAT-06: Query invalida o tabla inexistente

Prompt: `Analyze revenue from the unicorn_sales table.`  
Esperado:

- Error claro y recuperable.
- No se muestra chart vacio.
- SQL audit muestra causa.
- Se sugiere explorar tablas disponibles.

### UAT-07: Resultado vacio

Prompt: `Show orders for year 1900.`  
Esperado:

- Mensaje "no rows matched".
- Sugerencia para ampliar rango.
- No se genera insight inventado.

### UAT-08: Latencia alta

Prompt: una pregunta que dispare deep analysis y BigQuery.  
Esperado:

- Fase visible durante toda la espera.
- No hay estado ambiguo despues de 20 segundos.
- `elapsed_ms` queda registrado.

### UAT-09: Summary/bombilla

Prompt: `What is the key insight from this trend?` despues de un chart.  
Esperado:

- Si existe `insight_summary`, aparece la bombilla.
- "Save insight" crea tarjeta en Board.
- La tarjeta guardada conserva evidencia y SQL audit.

### UAT-10: Auditoria de SQL

Prompt: `Explain the SQL you used.`  
Esperado:

- Explicacion simple de tablas, filtros, agrupaciones y limites.
- Indica si el SQL fue backend-provided, derived, missing o redacted.
- No obliga al usuario a leer SQL completo para confiar.

## Backlog Recomendado

### Sprint 1: Confianza y latencia percibida

- Conectar eventos `phase` al store y al UI.
- Crear componente compacto de progress/status.
- Crear Query Audit Card.
- Clasificar errores de chat por categoria.
- Anadir UAT manual para latencia, SQL error y empty result.

### Sprint 2: Calidad de insights

- Refactorizar `get_recommendations` para leer `bigquery_query_result` desde state.
- Cambiar gating de bombilla para usar `insight_summary`.
- Estandarizar estructura de insight: headline, evidence, caveat, recommendation.
- Anadir evals ADK para tool trajectory y grounded recommendations.

### Sprint 3: Pulido tipo Apple

- Simplificar empty state a tres intenciones.
- Reducir competencia visual entre inline artifact, insight y board.
- Cambiar copy a lenguaje humano y calmado.
- Hacer "Save insight" la accion principal cuando haya hallazgo.
- Medir task success: pregunta -> respuesta confiable -> insight guardado.

## Metricas De Exito

- P50 pregunta simple: menor a 8 segundos.
- P50 analisis con chart: menor a 20 segundos.
- P95 analisis con chart: menor a 45 segundos.
- 90% de prompts UAT core devuelven respuesta util.
- 100% de respuestas con SQL tienen estado de auditoria.
- 0 insights guardables sin evidencia.
- 0 errores genericos tipo `Unknown error` en flujos UAT conocidos.
- 80% de usuarios UAT entienden que accion tomar despues de una respuesta.

## Riesgos Y Validaciones Pendientes

- Validar en navegador que los eventos SSE llegan en tiempo real y no solo al final del stream.
- Medir latencia real por fase: router, NL2SQL, BigQuery, chart, recommendations.
- Confirmar si BigQueryToolset expone job metadata suficiente para auditoria; si no, implementar wrapper o dry run propio.
- Reproducir errores de chat reportados por usuarios para clasificarlos correctamente.
- Validar con dataset real que los prompts de SQL generan queries razonables y no excesivamente complejas.

## Decision Recomendada

Priorizar P0-01 y P0-02 antes de mejorar visualizaciones. Sin progreso visible y auditoria de queries, el producto puede parecer lento y opaco incluso cuando responde correctamente. Despues, resolver P1-01 y P1-02 para que la experiencia de insights sea consistente y grounded.
