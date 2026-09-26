// An unsigned JWT whose payload carries only `exp` — all the client reads from a token.
export const jwtExpiringIn = (seconds) =>
  `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds }))}.signature`;
