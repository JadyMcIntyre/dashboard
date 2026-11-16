/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 */

const languagePreferenceKey = "renue-dashboard-language";
let dashboardLanguage = "en";
try {
  if (localStorage.getItem(languagePreferenceKey) === "es") dashboardLanguage = "es";
} catch { /* English remains available without browser storage. */ }

const spanishLabels = {
  "Settings": "Configuración", "Language": "Idioma", "Dashboard language": "Idioma del panel",
  "During a call": "Durante una llamada", "Follow-up": "Seguimiento", "Workspace": "Espacio de trabajo",
  "Insurance": "Seguros", "Treatment guide": "Guía de tratamientos", "Vitamins & IV": "Vitaminas y terapia intravenosa",
  "Messages": "Mensajes", "Manage templates": "Administrar plantillas", "Advisor hours": "Horario de asesores",
  "Voicemail scripts": "Guiones para buzón de voz", "Travel & transport": "Viaje y transporte",
  "Hours & contacts": "Horarios y contactos", "Resources": "Recursos", "Financing": "Financiamiento",
  "Working with": "Clínica seleccionada", "Clinic contact": "Contacto de la clínica",
  "Staff sign-in": "Acceso del personal", "Email": "Correo electrónico", "Password": "Contraseña",
  "Show": "Mostrar", "Hide": "Ocultar", "Sign in": "Iniciar sesión", "Sign out": "Cerrar sesión",
  "Remember email on this device": "Recordar el correo en este dispositivo",
  "Search insurance, scripts, resources…": "Buscar seguros, guiones y recursos…",
  "Text Messages": "Mensajes de texto", "Quick Send": "Envío rápido", "Show all clinics": "Mostrar todas las clínicas",
  "Find a template": "Buscar una plantilla", "Template type": "Tipo de plantilla", "Clear filters": "Borrar filtros",
  "Company default": "Plantillas de la empresa",
  "Company default · Spanish": "Plantillas de la empresa · Español",
  "Voicemail Scripts": "Guiones para buzón de voz", "Readouts": "Guiones para leer",
  "Financing Options": "Opciones de financiamiento",
  "Company emails": "Correos de la empresa", "Copy fax number": "Copiar número de fax",
  "Your name": "Tu nombre",
  "Company voicemail language": "Idioma de los guiones de la empresa",
  "Read aloud": "Leer en voz alta", "Readout script": "Guion para leer",
  "No voicemail scripts are available.": "No hay guiones disponibles.",
  "Company message language": "Idioma de los mensajes de la empresa",
  "Search wording or template name…": "Buscar por texto o nombre de plantilla…",
  "All templates": "Todas las plantillas", "Clinic callback": "Devolución de llamada",
  "Appointments": "Citas", "Treatment information": "Información sobre tratamientos",
  "Message preview": "Vista previa del mensaje", "Personalise & copy": "Personalizar y copiar",
  "Personalise message": "Personalizar mensaje", "Patient name": "Nombre del paciente",
  "Date": "Fecha", "Time": "Hora", "Cancel": "Cancelar", "Copy Message": "Copiar mensaje",
  "Message copied to clipboard.": "Mensaje copiado al portapapeles.",
  "No matching templates. Clear the filters or try different wording.": "No hay plantillas que coincidan. Borra los filtros o prueba otra búsqueda.",
  "All clinics · Choose a template to read and copy.": "Todas las clínicas · Elige una plantilla para leer y copiar.",
  "General templates are included.": "Se incluyen las plantillas generales.",
  "Weekly advisor schedule": "Horario semanal de asesores", "Advisor": "Asesor", "Actions": "Acciones",
  "Sunday": "Domingo", "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
  "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Off": "Libre", "You": "Tú",
  "Ends next day": "Termina al día siguiente", "Edit": "Editar",
  "Spanish is available for navigation and company messages. Some screens and reference content are still in English.": "La navegación y los mensajes de la empresa están disponibles en español. Algunas pantallas y partes del contenido de referencia siguen en inglés."
};

function translateLabel(label) {
  return dashboardLanguage === "es" && Object.hasOwn(spanishLabels, label) ? spanishLabels[label] : label;
}

function initialiseLanguageSettings() {
  document.documentElement.lang = dashboardLanguage;
  for (const element of document.querySelectorAll("[data-translate]")) {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.textContent = node.textContent.replace(node.textContent.trim(), translateLabel(node.textContent.trim()));
      }
    }
  }
  for (const element of document.querySelectorAll("[data-translate-placeholder]")) {
    element.placeholder = translateLabel(element.placeholder);
  }
  const language = document.querySelector("#dashboard-language");
  language.value = dashboardLanguage;
  language.addEventListener("change", () => {
    try { localStorage.setItem(languagePreferenceKey, language.value); }
    catch {
      language.value = dashboardLanguage;
      document.querySelector("#dashboard-language-status").textContent = dashboardLanguage === "es"
        ? "El navegador no permite guardar el idioma."
        : "This browser could not save your language preference.";
      return;
    }
    window.location.reload();
  });
}

const spanishCompanyMessages = {
  "clinic-callback": ["Devolución de llamada", "Hola <>,\n\nSoy {{staffName}} de Renue Wellness. Te llamamos antes y no pudimos comunicarnos contigo. Puedes llamar al @clinic number para hablar con nuestro equipo o responder con un horario en el que podamos llamarte.\n\n{{org:website}}"],
  "initial-follow-up": ["Seguimiento inicial", "Hola <>,\n\nSoy {{staffName}} de Renue Wellness. Intenté comunicarme contigo sobre tu solicitud de información acerca de nuestros tratamientos. Cuando tengas un momento, puedes llamarme o enviarme un mensaje a este número. Con gusto te ayudaré."],
  "lead-follow-up": ["Seguimiento de solicitud de información", "Hola <>,\n\nSoy {{staffName}} de Renue Wellness. Hace un tiempo completaste un formulario para recibir información sobre nuestros tratamientos de salud mental. Quería saber si todavía te interesa conocer las opciones. Puedes comunicarte con nosotros cuando quieras. Estamos aquí para apoyarte."],
  "inactive-status": ["Aviso de cuenta inactiva", "Hola <>,\n\nSoy {{staffName}} de Renue Wellness. Espero que estés bien.\n\nHemos intentado comunicarnos contigo en varias ocasiones. Por ahora pasaremos tu expediente a estado inactivo. Puedes volver a contactarnos cuando estés listo para retomar el tratamiento.\n\nSi decides continuar, puedes llamarme o enviarme un mensaje y con gusto te ayudaré.\n\nEl equipo de Renue Wellness"],
  "appointment-confirmation": ["Confirmación de cita", "Hola <>,\n\nTe escribimos de Renue Wellness para confirmar tu cita para el {{appointmentDateTime}}.\n\nResponde YES para confirmar o NO para cancelar o reprogramar."],
  "reschedule-consultation": ["Reprogramar una consulta", "Hola <>,\n\nAvísame si quieres reprogramar tu consulta con el médico y con gusto te ayudaré. Estamos aquí para ayudarte cuando estés listo."],
  "missed-first-treatment": ["Primera sesión perdida", "Hola <>,\n\nNo pudimos verte en tu primera sesión de tratamiento. Espero que todo esté bien. Si surgió algo o necesitas otro horario, con gusto te ayudaremos a reprogramar. Puedes comunicarte con nosotros cuando estés listo."],
  "missed-consultation": ["Consulta perdida", "Hola <>,\n\nNo pudimos verte en tu consulta. Espero que todo esté bien. Si surgió algo o necesitas otro horario, con gusto te ayudaremos a reprogramar. Puedes comunicarte con nosotros cuando estés listo."],
  "evaluation-reschedule": ["Seguimiento para reprogramar una evaluación", "Buenas tardes, <>.\n\nNo hemos podido comunicarnos contigo para reprogramar tu evaluación. Si quieres hablar sobre los próximos pasos, puedes llamarnos o responder a este mensaje cuando te convenga."],
  "previous-conversation": ["Seguimiento de una conversación", "Buenas tardes, <>. Soy {{staffName}} de Renue Wellness.\n{{org:website}}\n\nLa semana pasada hablamos sobre nuestros tratamientos de salud mental. Quería saludarte y saber si todavía te interesa recibir información."],
  "ready-for-treatment": ["Seguimiento para iniciar el tratamiento", "Hola <>,\n\nQuería saber cómo estás. Nos gustaría apoyarte en el próximo paso. Si estás listo, podemos programar el tratamiento en un horario que te convenga. Estamos aquí para ayudarte cuando lo necesites."],
  "not-ready": ["Seguimiento de apoyo", "Hola <>,\n\nQuería saber cómo te ha ido. Mencionaste que aún no te sentías listo. Si tienes preguntas o quieres conversar sobre tus opciones, con gusto te ayudaré a tomar la decisión con más tranquilidad. Puedes hacerlo a tu ritmo."],
  "ivk-spravato-overview": ["Información sobre ketamina intravenosa y Spravato", "Hola <>,\n\nLa ketamina intravenosa y Spravato son dos de nuestras opciones de tratamiento. Tu profesional de salud puede ayudarte a determinar cuál es adecuada para ti.\n\n• Ketamina intravenosa: el protocolo inicial de la clínica incluye 6 infusiones en 3 semanas, dos veces por semana durante 3 semanas consecutivas. El paciente paga este tratamiento directamente y hay opciones de pago disponibles.\n\n• Spravato: un aerosol nasal recetado para adultos que cumplen los criterios para el tratamiento de la depresión resistente. El esquema inicial es dos veces por semana durante 4 semanas y luego una vez por semana durante otras 4 semanas. El profesional de salud indicará el mantenimiento. La cobertura depende del plan, los criterios clínicos y la autorización.\n\nPodemos ayudarte a programar una evaluación y revisar los próximos pasos.", "Confirma la disponibilidad en la clínica y el plan del profesional de salud. Haber probado antidepresivos no garantiza la cobertura."],
  "integration-therapy": ["Terapia de integración entre sesiones", "Hola <>,\n\nNo ofrecemos terapia de integración durante la sesión de tratamiento. La terapia entre sesiones de ketamina puede darte tiempo para reflexionar sobre las emociones, ideas o cambios de perspectiva que hayan surgido.\n\nTu profesional de salud o terapeuta puede ayudarte a planificar el apoyo entre sesiones y a conversar sobre cómo aprovechar la experiencia del tratamiento.", "Consulta con el profesional tratante sobre el apoyo y el momento adecuado."],
  "no-response-after-consult": ["Sin respuesta después de una consulta o evaluación", "Hola <>. Soy {{staffName}} de Renue Wellness. Queríamos saber cómo estás, ya que hace tiempo que no te vemos en la clínica. Podemos ayudarte a retomar el tratamiento o a ajustar el horario.\n\nTu profesional de salud puede orientarte sobre cómo continuar el tratamiento y mantener tus avances.\n\nLas autorizaciones del seguro pueden vencer si el tratamiento se interrumpe demasiado tiempo. En ese caso, podría ser necesario reiniciar el trámite. Si no recibimos respuesta, tu cuenta quedará inactiva por ahora. Puedes volver a comunicarte con nosotros cuando quieras.", "Usa este mensaje cuando corresponda según el proceso de seguimiento de la clínica. Confirma la autorización antes de enviarlo."]
};

const spanishCompanyVoicemails = new Map([
  ["Online Form", ["Formulario en línea", "Hola, [Nombre]. Soy @me de Renue Wellness. Vi que completaste nuestro formulario en línea y quería saber cómo podemos ayudarte. Con gusto responderé tus preguntas y te contaré sobre las opciones de tratamiento que ofrecemos. Puedes devolverme la llamada cuando te convenga."]],
  ["Returning a Call – Patient Requested Information", ["Devolución de llamada por una solicitud de información", "Hola, [Nombre]. Soy @me de Renue Wellness. Te devuelvo la llamada porque querías saber más sobre nuestros tratamientos. Con gusto responderé tus preguntas y te explicaré las opciones. Puedes devolverme la llamada cuando te convenga."]],
  ["Missed appointment", ["Cita de tratamiento perdida", "Hola, [Nombre]. Soy @me de Renue Wellness. Te llamo porque hoy no pudimos verte en tu cita de tratamiento con ketamina. Espero que todo esté bien. Si quieres reprogramar, podemos ayudarte. Llámanos cuando tengas un momento."]],
  ["Consultation – Missed Appointment Voicemail", ["Consulta perdida con el médico", "Hola, [Nombre]. Soy @me de Renue Wellness. Te llamo porque hoy no pudimos verte en tu consulta con el médico. Espero que todo esté bien. Cuando estés listo, con gusto te ayudaremos a reprogramar. Puedes devolvernos la llamada cuando te convenga. Cuídate."]]
]);
