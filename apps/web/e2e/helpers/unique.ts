export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@e2e.test`;
}
