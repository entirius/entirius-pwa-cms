const TERMINAL_CODES = ['invalid_key']

export function parsePasswordError(error) {
  const meta = error?.meta
  const status = meta?.status
  const message = meta?.message

  if (TERMINAL_CODES.includes(status)) {
    return { isTerminal: true, message: message || '' }
  }

  if (message) {
    return { isTerminal: false, message }
  }

  return { isTerminal: false, message: '' }
}
