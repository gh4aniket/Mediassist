import MedicalProfile from '../models/MedicalProfile.js'
import asyncHandler from '../utils/asyncHandler.js'
import { askAssistant } from '../services/ragService.js'

const SUGGESTIONS = [
  'What are the symptoms of low blood sugar?',
  'How can I manage my hypertension naturally?',
  'What medications interact with Metformin?',
  'When should I go to the emergency room?',
  'What are the signs of a stroke?',
  'What are common signs of a heart attack?',
]

/**
 * POST /api/assistant/chat
 * Body: { message: string }
 * A thin proxy to the RAG microservice. Chat history is deliberately not
 * persisted — no chat-log collection in this build.
 */
export const chat = asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').trim()

  const profile = await MedicalProfile.findOne({ patientId: req.user._id })
  const result = await askAssistant(message, {
    // Light grounding context; the RAG service is free to ignore it.
    patientContext: profile
      ? {
          bloodGroup: profile.bloodGroup || undefined,
          allergies: profile.allergies,
          conditions: profile.conditions,
          medications: profile.medications?.map((m) => m.name).filter(Boolean),
        }
      : undefined,
  })

  res.json({
    success: true,
    data: {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: result.answer,
      timestamp: new Date().toISOString(),
      sources: result.sources,
      urgent: result.urgent,
    },
    meta: { engine: result.source, degraded: Boolean(result.degraded) },
  })
})

/** GET /api/assistant/welcome — greeting plus starter prompts for a fresh chat. */
export const welcome = asyncHandler(async (req, res) => {
  const firstName = String(req.user.name || '').split(' ')[0] || 'there'

  res.json({
    success: true,
    data: {
      message: {
        id: 'ai-welcome',
        role: 'assistant',
        content: `Hello ${firstName}! I'm MediAssist AI, your personal health assistant. I can help you understand symptoms, learn about medications, prepare for doctor appointments, and provide general health information.\n\n**Remember:** For emergencies, always call your local emergency number or use the Request Ambulance feature.`,
        timestamp: new Date().toISOString(),
        suggestions: SUGGESTIONS.slice(0, 3),
      },
      suggestions: SUGGESTIONS,
    },
  })
})

/** GET /api/assistant/suggestions */
export const suggestions = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: SUGGESTIONS })
})
