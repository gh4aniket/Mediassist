import env from "../config/env.js";

/**
 * Thin client for the FastAPI RAG service.
 *
 * FastAPI contract:
 *
 * POST /query
 * body:
 * {
 *   question: string
 * }
 *
 * response:
 * {
 *   result: string,
 *   sources: [
 *     {
 *       source: string,
 *       page: number | null
 *     }
 *   ]
 * }
 */

const FALLBACK_RESPONSES = [
  {
    keywords: ["chest pain", "heart attack", "cardiac"],
    urgent: true,
    answer:
      "**Chest pain can be a medical emergency.** If you are experiencing chest pain now — especially with shortness of breath, arm or jaw pain, sweating, or nausea — call your local emergency number immediately or use the Request Ambulance feature.\n\nCommon causes include cardiac (angina, heart attack), musculoskeletal, gastrointestinal reflux, and panic attacks.\n\nDo not drive yourself to hospital during an active cardiac event.",
    sources: ["American Heart Association", "Mayo Clinic — Chest Pain"],
  },
  {
    keywords: ["stroke", "face drooping", "arm weakness", "slurred"],
    urgent: true,
    answer:
      "**If you suspect a stroke, act FAST — every minute matters.**\n\n- **F** — Face drooping\n- **A** — Arm weakness\n- **S** — Speech difficulty\n- **T** — Time to call emergency services\n\nOther signs: sudden severe headache, vision loss, loss of balance. Do not wait to see whether symptoms improve.",
    sources: ["American Stroke Association", "CDC — Stroke Signs"],
  },
  {
    keywords: ["blood pressure", "hypertension", "bp"],
    urgent: false,
    answer:
      "Managing hypertension combines lifestyle changes with medication:\n\n- Reduce sodium to under 1,500–2,300 mg/day\n- 30+ minutes of activity most days\n- Limit alcohol, avoid smoking\n- Manage stress and maintain a healthy weight\n\nThe DASH diet is designed specifically for blood-pressure control. Take prescribed medication at the same time each day.",
    sources: ["AHA — High Blood Pressure", "NIH DASH Diet"],
  },
  {
    keywords: ["metformin", "diabetes", "blood sugar", "insulin"],
    urgent: false,
    answer:
      "**Metformin** is a first-line medication for Type 2 diabetes.\n\n- **How it works:** reduces glucose production in the liver and improves insulin sensitivity.\n- **Taking it:** always with meals, to limit stomach upset. Do not skip doses.\n- **Watch for:** nausea and diarrhoea early on; rarely, lactic acidosis — seek care for unusual muscle pain or breathing difficulty.\n- **Interactions:** alcohol raises lactic-acidosis risk; tell any provider before contrast imaging.",
    sources: ["FDA — Metformin Label", "ADA — Diabetes Medication Guide"],
  },
  {
    keywords: ["headache", "migraine", "head pain"],
    urgent: false,
    answer:
      "Headaches commonly stem from tension, dehydration, poor posture, or migraine. Rest in a dark room, hydration, and over-the-counter analgesics usually help.\n\n**Seek emergency care for:** the sudden worst headache of your life, headache with fever or a stiff neck, headache after a head injury, or headache with vision changes or weakness.",
    sources: ["Mayo Clinic — Headache", "CDC — Migraine Information"],
  },
];

const GENERIC_ANSWER = {
  urgent: false,
  answer:
    "I can share general health information, but for anything specific to you please check with your healthcare provider.\n\nI can also help you find nearby hospitals, explain a medication you have been prescribed, or prepare questions for your next appointment.",
  sources: [],
};

function offlineAnswer(question) {
  const lower = String(question).toLowerCase();

  const match = FALLBACK_RESPONSES.find((r) =>
    r.keywords.some((k) => lower.includes(k)),
  );

  return {
    ...(match || GENERIC_ANSWER),
    offline: true,
  };
}

/**
 * FastAPI returns:
 *
 * [
 *   {
 *     source: "document.pdf",
 *     page: 3
 *   }
 * ]
 *
 * Preserve that structure instead of converting it to strings.
 */
function normaliseSources(sources) {
  if (!Array.isArray(sources)) return [];

  return sources
    .map((s) => {
      if (!s || typeof s !== "object") return null;

      return {
        source: s.source ?? "unknown",
        page: s.page ?? null,
      };
    })
    .filter(Boolean);
}

/**
 * Heuristic red flag, applied whichever backend answered.
 */
function looksUrgent(text) {
  return /\b(911|emergency|call an ambulance|immediately|life-threatening)\b/i.test(
    String(text),
  );
}

export async function askAssistant(question, context = {}) {
  if (!env.ragServiceUrl) {
    const fallback = offlineAnswer(question);

    return {
      answer: fallback.answer,
      sources: fallback.sources,
      urgent: fallback.urgent,
      source: "offline-fallback",
    };
  }

  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), env.ragTimeoutMs);

  try {
    const response = await fetch(`${env.ragServiceUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        ...context,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RAG service responded ${response.status}`);
    }

    const payload = await response.json();

    // FastAPI returns `result`, not `answer` or `response`.
    const answer = payload.result || "";

    // FastAPI returns:
    // sources: [{ source, page }]
    const sources = normaliseSources(payload.sources);

    return {
      answer,
      sources,
      urgent: looksUrgent(answer),
      source: "rag",
    };
  } catch (err) {
    console.warn("[rag] falling back to offline responder:", err.message);

    const fallback = offlineAnswer(question);

    return {
      answer: fallback.answer,
      sources: fallback.sources,
      urgent: fallback.urgent,
      source: "offline-fallback",
      degraded: true,
    };
  } finally {
    clearTimeout(timer);
  }
}
