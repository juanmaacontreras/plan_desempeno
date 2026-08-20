# El Fogón de los Educadores

Herramienta interna de la **Unidad Scout Perito Moreno** (G.S. San Jorge Mártir N°169) para que los Ayudantes de Unidad armen su Plan de Desempeño sin partir de una hoja en blanco.

Es un test de ~39 postas con escenas reales de la vida de la unidad. Al terminar devuelve un retrato del educador (arquetipo + radar + carta) y las listas de **Logrado** y **A desarrollar**, y manda el resultado automáticamente al subjefe de rama.

**Autor / responsable:** Juanma (subjefe de la Rama Scouts).

---

## Stack y arquitectura

Todo el test corre en el navegador. No hay build, ni framework, ni dependencias que instalar.

```
index.html (GitHub Pages)
    │
    │  fetch POST al terminar el test
    ▼
Google Apps Script (cuenta de Juanma)
    │
    ├──> crea un Google Doc editable en su Drive
    └──> le manda un mail con el link + resumen
```

- **`index.html`** — un solo archivo autocontenido: HTML + CSS + JS inline. Sin build step.
- **`apps_script_fogon.gs`** — backend. NO se despliega desde el repo: se pega a mano en script.google.com.
- **jsPDF** — única dependencia, vía CDN. Genera el PDF que el usuario descarga para sí mismo.
- **Fuentes** — Fraunces / Work Sans / IBM Plex Mono desde Google Fonts.

Hosting: GitHub Pages (`juanmaacontreras.github.io/<repo>`). Sin custom domain — se intentó `unidad.scout.perito.moreno` y no es un dominio válido (no existe la TLD `.moreno`).

---

## Cómo está organizado el JS

Todo dentro del `<script>` de `index.html`, en este orden:

| Bloque | Qué hace |
|---|---|
| `COMP` | Las 5 competencias esenciales (nombre, color, ícono) |
| Constantes fijas | `FUNCION_FIJA`, `RAMA_FIJA`, `ORGANISMO_FIJO`, `PERIODO_FIJO` |
| `ICONS` | Paths SVG de los arquetipos |
| `ARCHETYPES` | Los 5 arquetipos con su descripción |
| `SCENARIOS` | 26 escenas de unidad |
| `LATERALS` | 9 preguntas "de costado" (no parecen scout pero mapean igual) |
| `PRIORITY_QUESTIONS` | 4 postas ilustradas de prioridad (con SVG inline) |
| `CLUSTERS` / `RAMA_ITEMS` | Indicadores del Manual, agrupados |
| `buildQuestions()` | Arma y baraja el test |
| `computeScores()` | Nivel real 0–3 por competencia |
| `computeProfile()` | Inclinación relativa → define el arquetipo |
| `computeDebiles()` / `esLogrado()` | Clasificación Logrado / A desarrollar |
| `showResults()` | Orquesta todo el render final |
| `buildPDF()` | Genera el PDF con jsPDF |
| `autoEnviarResultado()` | POST al Apps Script |

---

## Decisiones de diseño (no revertir sin pensarlo)

Estas cosas se probaron, fallaron de alguna forma, y se arreglaron. Cambiarlas a ciegas rompe algo.

### 1. Ninguna respuesta es "la correcta" a la vista
Las opciones se barajan en cada carga (`shuffle`) y todas son plausibles. Lo que cambia entre ellas es el **nivel de competencia** que revelan, no si son buenas o malas. Si agregás postas nuevas, mantené esto: nada de "opción obviamente correcta".

### 2. El arquetipo sale de la inclinación, no del puntaje bruto
`computeProfile()` normaliza por el "techo" de cada competencia. Sin eso, *pensamiento crítico* ganaba casi siempre, porque aparece en muchas más opciones que las demás (está sobrerrepresentado en los datos). Si tocás los pesos `w`, revisá que el arquetipo siga variando entre perfiles distintos.

### 3. El test mide disposición, no evidencia
Los indicadores del Manual que afirman un **hecho verificable** —una cantidad ("seguimiento de al menos 3"), un entregable ("ya elaboré un Plan de Desempeño") o el uso de un recurso nombrado ("la biblioteca web")— **nunca** pueden ir a Logrado. Las postas son escenas hipotéticas: revelan cómo reaccionarías, no qué pasó en el año.

Antes sí iban: `sc2` ("Hago seguimiento personal de al menos 3 Scouts") entraba a Logrado con solo tener 3 de 5 competencias aprobadas, sin que ninguna posta tocara el tema. Daba por hecho cosas que no ocurrieron.

Van marcados con `verify:true` (cluster entero) o `verify:'texto'` (cuando el indicador mezcla capacidad y hecho: la capacidad queda en `text`, el hecho se separa). Terminan en la **sección C — A verificar con tu Acompañante**, con tono neutro: no cuentan como logrado ni como debilidad, no afectan el puntaje ni el arquetipo. Se chequean cara a cara en la reunión.

Hoy son 3: cluster `progresion`, cluster `digital`, y el ítem de seguimiento de la rama. Si agregás indicadores, aplicá el mismo criterio.

### 4. Nadie puede sacar todo logrado
Dos reglas combinadas en `esLogrado(score, comp)`:
- Umbral absoluto alto: `UMBRAL_LOGRADO = 2.1`
- **Las 1–2 competencias más débiles de la persona siempre van a "a desarrollar"**, aunque en absoluto estén bien.

Esto se ajustó varias veces. Antes daba "todo logrado" a cualquiera que respondiera parejo. La regla de los débiles es la que garantiza el equilibrio. El pool de A/B es de 10 ítems (los 3 fácticos viven en C): rango típico hoy, entre 5/5 y 8/2.

### 5. La carta no puede contradecirse
`writeCarta()` evita nombrar la misma competencia como fortaleza y como debilidad. Pasaba: *"te apoyás en adaptabilidad… donde más te falta es adaptabilidad"*. Si el más flojo coincide con la fortaleza, usa el siguiente.

### 6. Las postas ilustradas no miden nivel
Las de `PRIORITY_QUESTIONS` alimentan solo el arquetipo (`_kind === 'priority'` las excluye de `computeScores()`). Son de prioridad pura: ninguna opción es mejor.

### 7. Las postas ilustradas nunca quedan juntas
`buildQuestions()` garantiza separación mínima de 3 preguntas entre ellas. Verificado con 200 corridas sin adyacencias.

---

## Limitaciones reales (no son bugs)

- **Una página estática no puede mandar mails ni crear Docs.** Por eso existe el Apps Script. Si `APPS_SCRIPT_URL` está vacía, la página entra en "modo prueba": muestra el resultado pero no envía nada.
- **`mode:'no-cors'`** en el fetch: el POST llega y el script lo procesa, pero el JS **no puede leer la respuesta**. Por eso el mensaje de éxito es optimista. Es la única forma de postear a Apps Script desde otro dominio sin configurar CORS.
- **`Content-Type: text/plain`** a propósito: evita el preflight OPTIONS que Apps Script no maneja bien.
- **No hay persistencia.** Si alguien cierra el navegador a mitad del test, pierde todo. Mejora pendiente.

---

## Trampas conocidas

- **Editaste el Apps Script y no cambia nada** → hay que hacer "Administrar implementaciones" → lápiz → **Nueva versión**. Crear una implementación nueva desde cero cambia la URL.
- **No llegan los mails** → revisá que en la implementación diga "Quién tiene acceso: **Cualquier persona**". Es el error más común.
- **Testear con Puppeteer** → hay que esperar ~600–900ms después de la última respuesta. Con menos, se lee el DOM antes de que renderice y da falsos "0 logrado / 0 a desarrollar" que parecen bugs y no lo son.

---

## Cómo probar cambios

```bash
# levantar local
python3 -m http.server 8000
# abrir http://localhost:8000
```

Si tocaste la lógica de puntaje, verificá con varios perfiles que:
- Aparezcan **arquetipos distintos** según cómo se responde
- **Nadie saque 13/0** ni 0/13 salvo casos extremos genuinos
- La carta **no se contradiga**

---

## Configuración

En `index.html`, cerca del final:

```js
const APPS_SCRIPT_URL = ''; // ← pegar la URL del Apps Script (termina en /exec)
```

En `apps_script_fogon.gs`:

```js
const MI_MAIL = 'juammac.scout@gmail.com';
const CARPETA_ID = ''; // opcional: ID de carpeta de Drive donde guardar los Docs
```

Datos fijos del contexto (la herramienta es solo para este caso, por eso no se piden en el formulario — solo se pide el nombre):

- Función: Ayudante de Unidad — Rama Scouts
- Organismo: G.S. San Jorge Mártir N°169 — Unidad Scout Perito Moreno
- Período: Agosto 2026 – Enero 2027

---

## Ideas pendientes

- Guardar progreso en el navegador (39 postas es largo; si se cierra, se pierde todo)
- Vista de coordinador: radar del equipo completo para detectar dónde flojea la unidad y armar formación grupal
- Rebalancear pesos si en uso real *Adaptabilidad* aparece como punto débil demasiado seguido (en las pruebas salió en 4 de 8 perfiles)
- Accesibilidad: navegación por teclado y lectores de pantalla

---

## Base documental

Todo el contenido sale de dos documentos oficiales de Scouts de Argentina:

- **Manual de Funciones y Competencias 2022** — las 5 competencias esenciales, sus 3 niveles, y los indicadores por función y por rama
- **Planilla de Plan de Desempeño** — la estructura A) Logrado / B) A desarrollar / C) Acuerdos particulares

Las referencias que aparecen en los resultados (ej: "Indicadores comunes 10–16, 18–20") apuntan a ese Manual. Si se agregan indicadores nuevos, respetar esa numeración.

El nivel objetivo para Ayudante de Unidad es **Nivel 1 — Conocimiento y comprensión** (el más básico de los tres). Esto importa: alguien con experiencia responde muy por encima de esa vara, y por eso hizo falta la regla de los "más débiles" para que el resultado siga siendo útil.
