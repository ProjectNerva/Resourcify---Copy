// Interface strings in English and Spanish. San Diego County has more than
// 320,000 Spanish speakers with limited English, and 211 itself serves them;
// a front door that only opens in English shuts them out before they reach
// anything useful.
//
// The choice is held in React state for the tab and nothing is written to
// storage, matching the privacy page. `?lang=es` lets a printed card or a
// partner link open the app already in Spanish.
//
// Screens that are still English-only say so in Spanish and point to 211,
// rather than mixing languages mid-form.

export const LANGS = ["en", "es"];

export function pickLang(
  search = window.location.search,
  navLang = navigator.language || "",
) {
  const param = new URLSearchParams(search).get("lang");
  if (LANGS.includes(param)) return param;
  return navLang.toLowerCase().startsWith("es") ? "es" : "en";
}

const STRINGS = {
  en: {
    settings: {
      title: "Settings",
      language: "Language · Idioma",
      mesh: "Show mesh radio messaging",
      meshHint:
        "The radio screen also appears on its own when you are offline or plug in a radio you used here before.",
      radioFound: "A Meshtastic radio is plugged in.",
      openMesh: "Open mesh messages",
    },
    nav: {
      home: "Home",
      guide: "Ask for help",
      analysis: "Rationer",
      programs: "Benefits",
      recycle: "Cash for Cans",
      map: "Community Map",
      mesh: "Mesh messages",
    },
    home: {
      title: "Make a plan with what you have.",
      lead: "Practical tools for supplies, local support and everyday decisions.",
      checking: "Checking online services…",
      online: "Online services configured.",
      partial: "Some online services are unavailable. Manual tools are ready.",
      offline: "Online services unavailable. Manual tools are ready.",
      subtitles: {
        guide: "Ask a question about local services",
        analysis: "Identify supplies and plan a budget",
        programs: "Explore relevant assistance programs",
        recycle: "Count materials and use confirmed rates",
        map: "Search services and get directions",
        mesh: "Needs a Meshtastic radio. Short texts with no cell service",
      },
      privacy:
        "No accounts, analytics or saved participant history. Photo and location services process input only when you choose them.",
      privacyLink: "Read how processing works.",
      helpNow:
        "Need help right now? Call 211. It is free, confidential and answered 24 hours a day. In an emergency, call 911.",
    },
    englishOnly: "",
    install: {
      text: "Install Resourcify to reopen the app easily. Only static app files are cached.",
      button: "Install app",
      dismiss: "Dismiss",
      error:
        "Installation was not completed. Use your browser’s install or Add to Home Screen menu.",
    },
    offline:
      "You are offline. Manual planning, benefits discovery and calculations work after the app is cached. Photo analysis and online searches need internet.",
    footer: {
      clear: "Clear this session",
      clearNote:
        "Clearing resets inputs and messages in this tab. Reloading also clears them.",
      disclaimer:
        "Resourcify does not determine benefit eligibility or provide emergency response. In a U.S. emergency call 911; for local assistance contact 211.",
      privacy: "Privacy",
      terms: "Terms",
      contact: "Contact",
    },
    guide: {
      heading: "Ask about local help",
      intro:
        "Answers come from 211 material about San Diego County services. This is not a person, and it cannot tell you whether you qualify for anything. To speak to someone, dial 211.",
      notConfigured:
        "The guide is not configured on this deployment. Safety information still works.",
      tryAsking: "Try asking:",
      suggestions: [
        "What are some ways to get financial help?",
        "Where can I get food today?",
        "I have nowhere to sleep tonight",
        "How do I see a doctor with no insurance?",
      ],
      questionLabel: "Your question",
      placeholder: "How do I get food stamps?",
      ask: "Ask",
      working: "Working…",
      sourcePrefix: "211 San Diego: ",
      noticeGrounded:
        "Answers come from 211 material and may be out of date. Resourcify cannot decide whether you qualify.",
      noticeUncovered:
        "Resourcify does not have that information. Dial 211 or visit 211sandiego.org to speak with someone.",
      noticeCrisis: "This is an automatic safety message, not a person.",
      privacyWarning:
        "Do not enter your name, address or anything you would not want sent to Google.",
      privacyLink: "How processing works.",
    },
    notice: {
      location: {
        title: "Send this location to Google?",
        body: "Your location goes through Resourcify to Google Places to find nearby places, and to Open-Meteo for the weather. A walking-route estimate sends it to Google Routes. Resourcify keeps none of it.",
      },
      photo: {
        title: "Send this photo to Google?",
        body: "The photo goes through Resourcify to Google Gemini. Resourcify keeps no copy; Google's policies apply. Avoid faces, IDs and personal documents.",
      },
      radio: {
        title: "Send through the radio?",
        body: "Messages go to the radio's channel and may reach other people or gateways. Do not send personal or sensitive information.",
      },
      howProcessing: "How processing works",
      cancel: "Cancel",
      accept: "Accept",
      acceptRemember: "Accept and don't ask again",
    },
  },
  es: {
    settings: {
      title: "Ajustes",
      language: "Idioma · Language",
      mesh: "Mostrar mensajes por radio",
      meshHint:
        "La pantalla de radio también aparece sola cuando no tienes conexión o conectas un radio que ya usaste aquí.",
      radioFound: "Hay un radio Meshtastic conectado.",
      openMesh: "Abrir mensajes por radio",
    },
    nav: {
      home: "Inicio",
      guide: "Pide ayuda",
      analysis: "Suministros",
      programs: "Beneficios",
      recycle: "Reciclaje",
      map: "Mapa",
      mesh: "Radio",
    },
    home: {
      title: "Haz un plan con lo que tienes.",
      lead: "Herramientas prácticas para suministros, ayuda local y decisiones del día a día.",
      checking: "Revisando los servicios en línea…",
      online: "Servicios en línea listos.",
      partial:
        "Algunos servicios en línea no están disponibles. Las herramientas manuales sí funcionan.",
      offline:
        "Los servicios en línea no están disponibles. Las herramientas manuales sí funcionan.",
      subtitles: {
        guide: "Haz una pregunta sobre servicios locales",
        analysis: "Identifica suministros y planea un presupuesto",
        programs: "Explora programas de ayuda",
        recycle: "Cuenta materiales y usa tarifas confirmadas",
        map: "Busca servicios y cómo llegar",
        mesh: "Necesita un radio Meshtastic. Textos cortos sin señal de celular",
      },
      privacy:
        "Sin cuentas, sin rastreo y sin historial guardado. Las fotos y la ubicación se procesan solo cuando tú lo eliges.",
      privacyLink: "Lee cómo funciona el procesamiento.",
      helpNow:
        "¿Necesitas ayuda ahora? Llama al 211. Es gratis, confidencial y atiende las 24 horas. En una emergencia, llama al 911.",
    },
    englishOnly:
      "Esta pantalla está en inglés por ahora. Para ayuda en español, marca 211. Es gratis y atiende las 24 horas.",
    install: {
      text: "Instala Resourcify para abrir la app más fácil. Solo se guardan los archivos de la app.",
      button: "Instalar la app",
      dismiss: "Cerrar",
      error:
        "No se completó la instalación. Usa el menú de tu navegador: Instalar o Agregar a la pantalla de inicio.",
    },
    offline:
      "Estás sin conexión. La planificación manual, la búsqueda de beneficios y los cálculos funcionan si la app ya se guardó. El análisis de fotos y las búsquedas en línea necesitan internet.",
    footer: {
      clear: "Borrar esta sesión",
      clearNote:
        "Borrar quita lo que escribiste en esta pestaña. Recargar la página también lo borra.",
      disclaimer:
        "Resourcify no decide si calificas para un beneficio ni responde emergencias. En una emergencia en EE. UU. llama al 911; para ayuda local llama al 211.",
      privacy: "Privacidad",
      terms: "Términos",
      contact: "Contacto",
    },
    guide: {
      heading: "Pregunta sobre ayuda local",
      intro:
        "Las respuestas vienen de la información de 211 sobre servicios del Condado de San Diego. No es una persona y no puede decirte si calificas para algo. Para hablar con alguien, marca 211.",
      notConfigured:
        "La guía no está activada en esta instalación. La información de seguridad sí funciona.",
      tryAsking: "Prueba preguntar:",
      suggestions: [
        "¿Cómo puedo conseguir ayuda con dinero?",
        "¿Dónde puedo conseguir comida hoy?",
        "No tengo dónde dormir esta noche",
        "¿Cómo veo a un doctor sin seguro?",
      ],
      questionLabel: "Tu pregunta",
      placeholder: "¿Cómo consigo estampillas de comida?",
      ask: "Preguntar",
      working: "Buscando…",
      sourcePrefix: "211 San Diego: ",
      noticeGrounded:
        "Las respuestas vienen de la información de 211 y pueden estar desactualizadas. Resourcify no puede decidir si calificas.",
      noticeUncovered:
        "Resourcify no tiene esa información. Marca 211 o visita 211sandiego.org para hablar con alguien.",
      noticeCrisis:
        "Este es un mensaje automático de seguridad, no una persona.",
      privacyWarning:
        "No escribas tu nombre, tu dirección ni nada que no quieras enviar a Google.",
      privacyLink: "Cómo funciona el procesamiento.",
    },
    notice: {
      location: {
        title: "¿Enviar esta ubicación a Google?",
        body: "Tu ubicación pasa por Resourcify a Google Places para buscar lugares cercanos y a Open-Meteo para el clima. Un cálculo de ruta a pie la envía a Google Routes. Resourcify no guarda nada.",
      },
      photo: {
        title: "¿Enviar esta foto a Google?",
        body: "La foto pasa por Resourcify a Google Gemini. Resourcify no guarda copia; aplican las reglas de Google. Evita caras, identificaciones y documentos personales.",
      },
      radio: {
        title: "¿Enviar por el radio?",
        body: "Los mensajes van al canal del radio y pueden llegar a otras personas o puertas de enlace. No envíes información personal ni delicada.",
      },
      howProcessing: "Cómo funciona el procesamiento",
      cancel: "Cancelar",
      accept: "Aceptar",
      acceptRemember: "Aceptar y no volver a preguntar",
    },
  },
};

export function strings(lang) {
  return STRINGS[LANGS.includes(lang) ? lang : "en"];
}
