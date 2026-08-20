/**
 * EL FOGÓN DE LOS EDUCADORES — Backend (Google Apps Script)
 * ---------------------------------------------------------
 * Qué hace: recibe el resultado de un test desde la página web,
 * crea un Google Doc editable con el Plan de Desempeño + el resultado,
 * y te lo manda por mail automáticamente. El usuario no hace nada.
 *
 * ⚠️ ESTE ARCHIVO NO SE DESPLIEGA DESDE EL REPO. Es la copia de referencia:
 * el código que corre de verdad está pegado a mano en script.google.com.
 * Si tocás algo acá, hay que copiarlo allá y republicar (ver abajo).
 *
 * CÓMO INSTALARLO (una sola vez):
 *  1. Entrá a https://script.google.com y creá un "Nuevo proyecto".
 *  2. Borrá todo el contenido de ejemplo y pegá ESTE archivo completo.
 *  3. Cambiá el mail de abajo (MI_MAIL) si alguna vez querés otro destino.
 *  4. Guardá (ícono del disquete).
 *  5. Arriba, hacé clic en "Implementar" → "Nueva implementación".
 *  6. Engranaje → elegí tipo "Aplicación web".
 *  7. Configurá:
 *       - "Ejecutar como": Yo (tu cuenta)
 *       - "Quién tiene acceso": Cualquier persona
 *  8. Clic en "Implementar". Te va a pedir autorizar permisos: aceptá.
 *     (Google te va a avisar que "no está verificada" → Configuración
 *      avanzada → Ir a (nombre del proyecto) → Permitir. Es tuyo, es seguro.)
 *  9. Copiá la "URL de la aplicación web" que te da. Termina en /exec.
 * 10. Pegá esa URL en la página (te digo dónde en el otro archivo).
 *
 * Cada vez que cambies el código, tenés que hacer "Implementar" →
 * "Administrar implementaciones" → editar (lápiz) → "Nueva versión".
 * Si creás una implementación NUEVA desde cero, cambia la URL y hay que
 * volver a pegarla en index.html.
 */

// ⚙️ Configuración — cambiá esto si hace falta
const MI_MAIL = 'juammac.scout@gmail.com';
// Opcional: si querés que los Docs se guarden en una carpeta específica de tu
// Drive, pegá acá el ID de la carpeta (lo sacás de la URL de la carpeta).
// Dejalo vacío ('') para que se guarden sueltos en tu Drive.
const CARPETA_ID = '';

/**
 * Punto de entrada: la página web llama a esta función vía POST.
 */
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);

    // 1. Crear el Google Doc editable
    const doc = crearDoc(datos);
    const urlDoc = doc.getUrl();

    // 2. Mandarte el mail con el link al Doc
    enviarMail(datos, urlDoc);

    // 3. Responder OK a la página
    return responder({ ok: true, docUrl: urlDoc });
  } catch (err) {
    return responder({ ok: false, error: String(err) });
  }
}

/**
 * Permite que el navegador reciba la respuesta (CORS).
 */
function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Crea el Google Doc con el plan de desempeño y el resultado del test.
 */
function crearDoc(d) {
  const titulo = 'Plan de Desempeño — ' + (d.nombre || 'Sin nombre');
  const doc = DocumentApp.create(titulo);
  const body = doc.getBody();

  // Encabezado
  body.appendParagraph('El Fogón de los Educadores')
      .setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Resultado del test y Plan de Desempeño')
      .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);

  // Datos de la persona
  const ficha = body.appendTable([
    ['Nombre y apellido', d.nombre || '—'],
    ['Organismo', d.organismo || '—'],
    ['Función', d.funcion || '—'],
    ['Período', d.periodo || '—'],
    ['Perfil de partida', d.arquetipo || '—'],
    ['Fecha de realización', new Date().toLocaleDateString('es-AR')]
  ]);
  ficha.setBorderWidth(0.5);

  body.appendParagraph('');

  // A) LOGRADO
  body.appendParagraph('A) Logrado')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Indicadores de las competencias que ya muestra en su desempeño cotidiano.')
      .setItalic(true);
  if (d.logrado && d.logrado.length) {
    d.logrado.forEach(function(item) {
      body.appendParagraph(item.titulo).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(item.texto);
      body.appendParagraph('Evidencia: ____________________________________________')
          .setForegroundColor('#888888');
    });
  } else {
    body.appendParagraph('Todavía no hay competencias consolidadas — punto de partida.');
  }

  body.appendParagraph('');

  // B) A DESARROLLAR
  body.appendParagraph('B) A desarrollar')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Indicadores a trabajar este período, con acciones a acordar con el Acompañante.')
      .setItalic(true);
  if (d.desarrollar && d.desarrollar.length) {
    d.desarrollar.forEach(function(item) {
      body.appendParagraph(item.titulo).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(item.texto);
      body.appendParagraph('Acción concreta: ______________   Plazo: __________   Acompaña: __________')
          .setForegroundColor('#888888');
    });
  } else {
    body.appendParagraph('Sin puntos urgentes por trabajar.');
  }

  body.appendParagraph('');

  // C) A VERIFICAR
  // Indicadores del Manual que afirman un HECHO (una cantidad, un entregable,
  // el uso de un recurso concreto). El test mide disposición, no evidencia:
  // no puede saber si eso pasó de verdad, así que no los da por logrados ni
  // los cuenta como debilidad. Se chequean cara a cara en la reunión.
  body.appendParagraph('C) A verificar con el Acompañante')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('El test mide disposición, no evidencia: estos indicadores hablan de hechos concretos y no se pueden dar por logrados sin chequearlos. Marcar en la reunión y, según la respuesta, moverlos a A) o a B).')
      .setItalic(true);
  if (d.verificar && d.verificar.length) {
    d.verificar.forEach(function(item) {
      body.appendParagraph(item.titulo).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(item.texto);
      body.appendParagraph('¿Ocurrió en el período?   [ ] Sí, con evidencia   [ ] Parcialmente   [ ] No')
          .setForegroundColor('#888888');
      body.appendParagraph('Observaciones: ________________________________________')
          .setForegroundColor('#888888');
    });
  } else {
    body.appendParagraph('Nada pendiente de chequear.');
  }

  body.appendParagraph('');

  // D) ACUERDOS PARTICULARES (para completar a mano)
  body.appendParagraph('D) Acuerdos particulares')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Tiempos disponibles, medio de contacto y fechas de revisión (a completar en la charla).');
  body.appendParagraph('• Fecha de revisión 1: ____________');
  body.appendParagraph('• Fecha de revisión 2: ____________');

  body.appendParagraph('');
  body.appendParagraph('Firma de Acompañado/a: ______________     Firma de Acompañante: ______________');

  doc.saveAndClose();

  // Mover a carpeta si se configuró una
  if (CARPETA_ID) {
    try {
      const archivo = DriveApp.getFileById(doc.getId());
      DriveApp.getFolderById(CARPETA_ID).addFile(archivo);
      DriveApp.getRootFolder().removeFile(archivo);
    } catch (err) {
      // si falla el movimiento, el doc igual queda en el Drive raíz
    }
  }

  return doc;
}

/**
 * Te manda el mail con el resumen y el link al Doc editable.
 */
function enviarMail(d, urlDoc) {
  const asunto = 'Nuevo Plan de Desempeño — ' + (d.nombre || 'Sin nombre');

  function lista(items, vacio) {
    return (items || []).map(function(i) { return '• ' + i.titulo; }).join('\n') || vacio;
  }
  const logradoTxt = lista(d.logrado, '(nada consolidado)');
  const desarrollarTxt = lista(d.desarrollar, '(sin puntos a trabajar)');
  const verificarTxt = lista(d.verificar, '(nada pendiente de chequear)');

  const cuerpo =
    'Completó el test El Fogón de los Educadores:\n\n' +
    'Nombre: ' + (d.nombre || '—') + '\n' +
    'Función: ' + (d.funcion || '—') + '\n' +
    'Período: ' + (d.periodo || '—') + '\n' +
    'Perfil: ' + (d.arquetipo || '—') + '\n\n' +
    '📄 PLAN DE DESEMPEÑO (Google Doc editable):\n' + urlDoc + '\n\n' +
    '── LOGRADO (' + (d.logrado ? d.logrado.length : 0) + ') ──\n' + logradoTxt + '\n\n' +
    '── A DESARROLLAR (' + (d.desarrollar ? d.desarrollar.length : 0) + ') ──\n' + desarrollarTxt + '\n\n' +
    '── A VERIFICAR EN LA REUNIÓN (' + (d.verificar ? d.verificar.length : 0) + ') ──\n' +
    'Hechos que el test no puede confirmar. Preguntarlos cara a cara.\n' + verificarTxt + '\n\n' +
    'El Doc ya está listo para editar y compartir con la persona.';

  MailApp.sendEmail(MI_MAIL, asunto, cuerpo);
}

/**
 * Función de prueba: corré esto una vez desde el editor (botón ▶ con
 * "probar" seleccionado) para verificar que crea el Doc y manda el mail.
 */
function probar() {
  const datosFalsos = {
    nombre: 'Prueba Test',
    organismo: 'G.S. San Jorge Mártir N°169 — Unidad Scout Perito Moreno',
    funcion: 'Ayudante de Unidad — Rama Scouts',
    periodo: 'Agosto 2026 – Enero 2027',
    arquetipo: 'Guardián de la Llama',
    logrado: [
      { titulo: 'Competencia esencial · Cultura Asociativa', texto: 'La tiene consolidada en su desempeño cotidiano.' },
      { titulo: 'Cuidado y protección (Indicadores comunes 1–9)', texto: 'Identifica riesgos y maneja primeros auxilios.' }
    ],
    desarrollar: [
      { titulo: 'Competencia esencial · Trabajo en equipo', texto: 'Está en un nivel razonable pero es de lo más flojo hoy.' }
    ],
    verificar: [
      { titulo: 'Progresión personal (Indicador común 17)', texto: 'Acompaño el seguimiento de la progresión personal de mi pequeño grupo, con la coordinación del Jefe/a de Unidad.' },
      { titulo: 'Herramientas digitales y formación (Indicadores comunes 28, 32–33)', texto: 'Conozco y uso la biblioteca web de Scouts de Argentina, uso al menos una herramienta digital para el aprendizaje, y ya elaboré un Plan de Desempeño con mi Acompañante.' },
      { titulo: 'Específicos Scouts 5, 7', texto: 'Hice seguimiento personal de al menos 3 Scouts durante el período.' }
    ]
  };
  const doc = crearDoc(datosFalsos);
  enviarMail(datosFalsos, doc.getUrl());
  Logger.log('Listo. Doc creado: ' + doc.getUrl());
}
