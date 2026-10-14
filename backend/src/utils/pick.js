/** Returns a copy of `source` limited to `keys` that are actually present. */
export default function pick(source, keys) {
  const out = {}
  if (!source) return out
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}
