import Activity from '../models/Activity.js'
import asyncHandler from '../utils/asyncHandler.js'

/** GET /api/activity/me — the patient dashboard's "Recent Activity" feed. */
export const listMyActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 8, 50)

  const entries = await Activity.find({ scope: 'patient', userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)

  res.json({ success: true, count: entries.length, data: entries.map((e) => e.toJSON()) })
})
