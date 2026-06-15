type AppErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportAppError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: AppErrorOptions = {},
) {
  if (typeof window === "undefined") return;

  const payload = {
    error,
    context: {
      route: window.location.pathname,
      ...context,
    },
    options: {
      mechanism: options.mechanism ?? "manual",
      handled: options.handled ?? false,
      severity: options.severity ?? "error",
    },
  };

  console.error("AppError:", payload);
}
