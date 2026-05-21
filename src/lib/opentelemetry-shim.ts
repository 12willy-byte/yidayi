// Shim for @opentelemetry/api to avoid Hermes dynamic import issues with Supabase
// Hermes doesn't support import() with variable expressions
export default {};
export const trace = {};
export const context = {};
export const propagation = {};
export const SpanStatusCode = { ERROR: "ERROR", OK: "OK" };
