/**
 * Every document is serialised as `{ id, ... }` (never `_id`/`__v`) because the
 * frontend was written against string ids like `h1` / `u1` in the mock data.
 */
export default function toClientPlugin(schema, options = {}) {
  const hide = new Set(['__v', ...(options.hide || [])])

  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = String(ret._id ?? ret.id ?? '')
      delete ret._id
      for (const field of hide) delete ret[field]
      return ret
    },
  })

  schema.set('toObject', { virtuals: true })
}
