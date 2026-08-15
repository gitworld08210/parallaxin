export type OperationalErrorContext = Record<string, unknown>;

export function reportOperationalError(
  area: string,
  error: unknown,
  context: OperationalErrorContext = {},
): void {
  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { message: String(error) };

  console.error(`[operational:${area}]`, normalized, context);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aurelix:operational-error", {
      detail: { area, error: normalized, context },
    }));
  }
}
