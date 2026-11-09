// Grounding material for the guide, plus the crisis rules that run before it.
//
// The model is NOT allowed to answer from its own knowledge. It may only use
// the TOPICS text below, and it must name the topic it used. That is the whole
// point: a general-purpose model asked about benefits will produce confident,
// plausible, out-of-date dollar figures and eligibility rules, and the people
// asking are in housing crisis.
//
// URLs VERIFIED 17 September 2026 against 211sandiego.org's page sitemap: each
// returns HTTP 200 directly (no redirect) and its <title> matches the topic.
// Re-check them before each pilot; 211 moves pages, and several old paths still
// return 200 while landing somewhere unrelated, so a status code alone proves
// nothing.
//
// BODIES VERIFIED 17 September 2026 against the text of the page each one
// links to, after an earlier draft written from general knowledge turned out to
// be largely unsupported. Reworded 20 September 2026 into short plain sentences
// (about a 7th-grade reading level) with the same facts; the earlier version
// tested at college level. Percentages appear verbatim on the source pages.
// Dollar amounts and income limits are left out on purpose even when the page
// states them, because they change yearly; the link carries the current figure.
// Do not add a claim unless you can point to the sentence on the page that
// backs it, and keep sentences short.
//
// 211 San Diego has no legal-aid page and no general family/children page, so
// those topics are deliberately absent: the guide will decline and point to 211
// rather than cite a page that does not cover the question.

const HOTLINE_211 = "Dial 211 or visit 211sandiego.org to speak with someone.";

const TOPICS = [
  {
    id: "food",
    title: "Food assistance",
    body: "211 can fill out your CalFresh application with you over the phone. They send it in for you. They tell you what papers the County may still need. CalFresh is the food stamp program, also called SNAP. It pays every month onto an EBT card. You use the card to buy groceries. Need food today? Food pantries give out groceries. Some places give packed lunches or dinners to take with you. Soup kitchens serve free hot meals. Most of these do not ask for paperwork. If you have a disability or an illness, food can be delivered to you. WIC helps women, babies and young children with food, breastfeeding support and health referrals.",
    url: "https://211sandiego.org/food-assistance-resources",
  },
  {
    id: "housing",
    title: "Housing and homelessness",
    body: "Call 211. A person will ask about your situation and what kind of housing you need. Emergency shelters give you a place to stay for now. 211 lists homeless drop-in centers, homeless shelters, domestic violence shelters, human trafficking shelters, crisis nurseries and childcare, runaway and youth shelters, and safe houses. Transitional housing is a longer stay with support. The goal is to move you into a permanent home. Some transitional programs only take people coming from an emergency shelter. Low-income apartments rent for less than normal. Most have a waiting list. Their lists are usually shorter than the lists for subsidized housing.",
    url: "https://211sandiego.org/housing-information/",
  },
  {
    id: "income",
    title: "Financial assistance and taxes",
    body: "211 can check if you can get free help filing your taxes. There is an income limit. If you qualify, they book the appointment for you. You can do it in person or online, in many languages. Filing can put money back in your pocket. The federal Earned Income Tax Credit and Child Tax Credit pay cash back. California adds the CalEITC and the Young Child Tax Credit. You must file a tax return to get the EITC. Bring a photo ID, your income papers such as W2s or 1099s, your bank details for direct deposit, and Social Security or ITIN numbers for you and your dependents. Free filing is offered online or at a VITA site.",
    url: "https://211sandiego.org/financial-assistance-tax-information/",
  },
  {
    id: "health",
    title: "Health and wellness",
    body: "211 can help you find low-cost medical care. They can help you get a ride to a doctor's appointment. They can help you pay for prescriptions. Covered California is the state health insurance marketplace. It offers different plans you can pick from. Kick It California gives free help to quit smoking, vaping or chew. Trained counselors speak many languages. In summer, Cool Zones are air-conditioned places to escape the heat. Most are in the hottest parts of the county. Older adults and anyone else can use them to stay cool and save on power bills.",
    url: "https://211sandiego.org/health-wellness/",
  },
  {
    id: "mental_health",
    title: "Mental health",
    body: "The San Diego Access and Crisis Line has a trained counselor ready to talk right now. They help with suicide prevention, a crisis, mental health referrals, and alcohol and drug support. The call is free and confidential. It is answered 24 hours a day, 7 days a week. 211 can also help you find counseling, support groups or long-term care. You can call for yourself or because you are worried about someone else. All calls are confidential, with no judgment.",
    url: "https://211sandiego.org/health-wellness/mental-health-services/",
  },
  {
    id: "utilities",
    title: "Utility assistance",
    body: "211 can check if you qualify for San Diego Gas and Electric discount programs. If you do, they submit the application for you. The CARE program can cut your bill by 30 percent or more. It depends on your household income, or on whether you get public assistance. If you do not qualify for CARE, they check FERA. FERA gives households of three or more people an 18 percent discount on the electric bill. The Neighbor-to-Neighbor program gives one-time help toward an SDG&E bill. It is for customers in SDG&E's area who do not qualify for state or federal help.",
    url: "https://211sandiego.org/utility-assistance/",
  },
  {
    id: "veterans",
    title: "Veteran and military services",
    body: "The Veterans Crisis Line is open 24/7. Dial 988 and press 1. You do not need to be enrolled with the VA. 211 helps Active-Duty service members, Veterans, Guard, Reservists and military family members. You can ask to talk with a Veteran Peer Specialist, someone who has served too. Call 211 and choose option 10, Monday to Friday, 8:00 am to 4:30 pm. Outside those hours, a 211 Community Connector can help. The help is free and confidential. It covers benefits, housing, health care, and the move to civilian work. They can also help you replace service records and DD-214 discharge papers.",
    url: "https://211sandiego.org/military-veterans/",
  },
  {
    id: "transport",
    title: "Transportation",
    body: "211 knows the local transportation options. That includes public transit, senior ride programs and paratransit. It also includes SANDAG's 511SD service and FACT San Diego's ride booking service. 211 can point you to help with bus fare. There are discount transit passes. There are rides for people who are homeless. There is help for long distance trips. There are ride-share and shuttle options. There is help paying for transportation. There is help for travelers. Older adults can get senior center bus rides, escort programs, paratransit and mature driver training.",
    url: "https://211sandiego.org/transportation/",
  },
  // Added 20 September 2026 from five further pages in 211's sitemap, each
  // fetched and read the same way. Digital access covers the phone and
  // internet barriers that research on this population ranks first.
  {
    id: "digital",
    title: "Digital access and learning",
    body: "Free public Wi-Fi is at parks, libraries and more. Some internet companies offer cheaper home internet plans. Public computer labs have computers and printers you can use. You can buy used computers, laptops and printers at low cost. Libraries and rec centers give free classes on computers and smartphones. There are online classes on internet safety, Zoom and social media. The California LifeLine Program cuts the cost of home phone and cell phone service. It is for households that qualify. Digital Navigation is one-on-one help with internet, devices and digital skills. There is also special equipment and training for people with special needs.",
    url: "https://211sandiego.org/digital-access-and-learning/",
  },
  {
    id: "older_adults",
    title: "Older adults",
    body: "211 gives free, confidential help to older adults. The goal is to stay healthy and independent at home. There is help with daily tasks and in-home personal care. There is training on assistive technology. There is Medicare counseling. There are health checks and mental health services, including PACE programs. Senior centers and social clubs help people stay connected. There is support for caregivers, plus companionship and support groups. Housing help covers assisted living referrals, home repairs, roommate matching and senior housing. Food help covers benefits screening, group meals, food banks, grocery delivery and meals brought to your home. There is also help with jobs, money planning and legal papers such as wills and advance directives. Respite care, safety programs and rides are available too. Call 211, or use the click-to-chat option on the website.",
    url: "https://211sandiego.org/olderadults",
  },
  {
    id: "reentry",
    title: "Justice-involved individuals",
    body: "211 helps people who just got out of prison or jail. It helps their families too. It works with the District Attorney, the Sheriff and Probation. The first 72 hours after release are the most important time to get connected to help. The San Diego Re-entry Roundtable is a group that meets on this. It includes jails and prisons, police, faith groups, government agencies and people who were once in prison. California's Fair Chance Act is also called Ban the Box. Under it, an employer cannot ask about your record on a job application. They can only ask after they offer you the job. Under Proposition 47, some old convictions can be changed to misdemeanors. This covers simple drug possession and petty theft. The San Diego Public Defender can help with that. Call (619) 338-4700. If you have a felony drug conviction and follow your probation or parole rules, you may qualify for CalFresh. 211 can also connect you to school, jobs, housing, legal help and substance use services.",
    url: "https://211sandiego.org/post-incarceration/",
  },
  {
    id: "lgbtq",
    title: "LGBTQ+ community",
    body: "211 connects LGBTQ+ people to support groups, mental health counseling, health care, housing help, substance use services and HIV and AIDS resources. PrEP is a daily medicine for people who are HIV negative and at high risk. Taken every day, it is highly effective at preventing HIV. PEP is a short course of medicine taken after a possible exposure to HIV. It must start within 72 hours. You can find a clinic for either through 211's database. HOPWA helps people living with HIV or AIDS find housing, and the site has a bed availability checker. Call 211 or use live chat on the website.",
    url: "https://211sandiego.org/lgbtq",
  },
  {
    id: "disaster",
    title: "Disaster services",
    body: "In a disaster, call 211 for information and resources. It is open any hour. It is not for emergencies. For an emergency, call 911. Sign up for county alerts at alertsandiego.org. Two apps show alerts and evacuation zones: SD Emergency from the County, and Genasys Protect. To report a power outage, call SDG&E at 1-800-611-7343. After a disaster, 211 has recovery resources. It also helps older adults, people with disabilities and anyone with access or functional needs make a plan.",
    url: "https://211sandiego.org/disasterservices/",
  },
];

// Every number the model is allowed to say. Anything numeric in an answer
// that is not in the corpus (or these hotlines) is treated as invented and
// the answer is withheld. Rule 3 of the prompt asks for this; this enforces it.
const NUMBER_ALLOWLIST = new Set(["211", "911", "988", "711", "24", "7"]);
function allowedNumbers() {
  const found = new Set(NUMBER_ALLOWLIST);
  for (const topic of TOPICS)
    for (const token of topic.body.match(/\d[\d,.:/-]*\d|\d/g) || [])
      found.add(token.replace(/,/g, ""));
  return found;
}

// Shown when the model itself flags a question as a possible crisis that the
// fixed patterns did not catch. The model never writes the words; it only
// raises the flag, and this text is served instead of its answer.
const CRISIS_BACKSTOP = {
  en: "It sounds like you or someone near you may be in danger. Please call or text 988 to reach the Suicide and Crisis Lifeline. It is free, confidential and open any hour. If there is immediate danger, call 911. To talk to a person about local help, dial 211.",
  es: "Parece que tú o alguien cerca de ti puede estar en peligro. Por favor llama o envía un mensaje de texto al 988, la Línea de Prevención del Suicidio y Crisis. Es gratis, confidencial y atiende a toda hora. Si hay peligro ahora, llama al 911. Para hablar con una persona sobre ayuda local, marca 211.",
};

const DECLINE = {
  en: "Resourcify does not have that information. Dial 211 or visit 211sandiego.org to speak with someone.",
  es: "Resourcify no tiene esa información. Marca 211 o visita 211sandiego.org para hablar con alguien.",
};

// Matched before the model is called, never by it. An LLM improvising a
// response to someone describing suicide, overdose or violence is not an
// acceptable risk, and a grounded corpus has no answer for it either.
const CRISIS_RULES = [
  {
    id: "suicide",
    pattern:
      // Includes the slang and shorthand people actually type. A miss here
      // means the question reaches the model; the model backstop is the
      // second net, not the first.
      /\b(kill myself|killing myself|end my life|ending my life|end it all|take my own life|suicide|suicidal|sucide|suicid|want to die|wanna die|wish i was dead|better off dead|no reason to live|no point in living|no point living|unalive|kms|self[- ]?harm|cut myself|cutting myself|hurt myself|hurting myself|don'?t want to be here|dont want to live|overdose on purpose)\b/i,
    answer:
      "Please talk to someone right now. Call or text 988 to reach the Suicide and Crisis Lifeline, any hour, free and confidential. If you are in immediate danger, call 911. San Diego County's Access and Crisis Line is also available at 888-724-7240.",
  },
  {
    id: "overdose",
    pattern:
      /\b(overdose|overdosing|od'?ing|took too many|can'?t breathe|unresponsive|not breathing)\b/i,
    answer:
      "If someone may be overdosing or cannot breathe, call 911 now. Stay with them. Naloxone reverses opioid overdose and is available without a prescription at pharmacies in California. San Diego County's Access and Crisis Line is 888-724-7240.",
  },
  {
    id: "violence",
    pattern:
      /\b(being (beaten|abused|hit)|he hits me|she hits me|domestic violence|my (partner|husband|wife|boyfriend|girlfriend) (hits|hurts|beats)|trafficked|being trafficked|sexual assault|raped)\b/i,
    answer:
      "If you are in immediate danger, call 911. The National Domestic Violence Hotline is 800-799-7233, or text START to 88788, any hour. San Diego's 211 line can arrange confidential emergency shelter; dial 211.",
  },
  {
    id: "child",
    pattern:
      /\b(child (abuse|neglect)|my kid is being hurt|hurting my child)\b/i,
    answer:
      "If a child is in immediate danger, call 911. San Diego County's Child Abuse Hotline is 858-560-2191, available at any hour.",
  },
  // Spanish. Same numbers; 988 offers Spanish by pressing 2 or texting AYUDA.
  {
    id: "suicide",
    lang: "es",
    pattern:
      /\b(matarme|suicidarme|suicidio|suicida|quitarme la vida|quiero morir|quiero morirme|no quiero vivir|mejor muert[oa]|no tengo raz[o\u00f3]n para vivir)\b/i,
    answer:
      "Por favor habla con alguien ahora mismo. Llama o env\u00eda un mensaje de texto al 988, la L\u00ednea de Prevenci\u00f3n del Suicidio y Crisis. Es gratis, confidencial y atiende a toda hora. Marca 2 para espa\u00f1ol, o env\u00eda la palabra AYUDA por texto. Si est\u00e1s en peligro ahora, llama al 911. La L\u00ednea de Acceso y Crisis del Condado de San Diego es 888-724-7240.",
  },
  {
    id: "overdose",
    lang: "es",
    pattern:
      /\b(sobredosis|no respira|no puede respirar|no responde|tom[o\u00f3] demasiadas|tom[o\u00f3] muchas pastillas)\b/i,
    answer:
      "Si alguien puede estar sufriendo una sobredosis o no puede respirar, llama al 911 ahora. Qu\u00e9date con la persona. La naloxona revierte una sobredosis de opioides y se consigue sin receta en farmacias de California. La L\u00ednea de Acceso y Crisis del Condado de San Diego es 888-724-7240.",
  },
  {
    id: "violence",
    lang: "es",
    pattern:
      /\b(me pega|me golpea|me maltrata|violencia dom[e\u00e9]stica|me violaron|me viol[o\u00f3]|abuso sexual|trata de personas|me tienen a la fuerza)\b/i,
    answer:
      "Si est\u00e1s en peligro ahora, llama al 911. La L\u00ednea Nacional contra la Violencia Dom\u00e9stica es 800-799-7233, a toda hora y con ayuda en espa\u00f1ol. La l\u00ednea 211 de San Diego puede conseguir refugio de emergencia confidencial; marca 211.",
  },
  {
    id: "child",
    lang: "es",
    pattern:
      /\b(abuso infantil|maltrato infantil|lastiman a mi hij[oa]|golpean a mi hij[oa]|le pegan a mi hij[oa])\b/i,
    answer:
      "Si un ni\u00f1o est\u00e1 en peligro ahora, llama al 911. La L\u00ednea de Abuso Infantil del Condado de San Diego es 858-560-2191, a toda hora.",
  },
];

function crisisAnswer(question) {
  const match = CRISIS_RULES.find((rule) => rule.pattern.test(question));
  return match
    ? {
        crisis: true,
        id: match.id,
        lang: match.lang || "en",
        answer: match.answer,
        sources: [],
      }
    : null;
}

function corpus() {
  return TOPICS.map(
    (topic) => `### ${topic.id} | ${topic.title}\n${topic.body}`,
  ).join("\n\n");
}

function topicById(id) {
  return TOPICS.find((topic) => topic.id === id) || null;
}

module.exports = {
  TOPICS,
  CRISIS_RULES,
  CRISIS_BACKSTOP,
  DECLINE,
  HOTLINE_211,
  crisisAnswer,
  corpus,
  topicById,
  allowedNumbers,
};
