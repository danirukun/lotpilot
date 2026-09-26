"use client";

type Props = Record<string, unknown>;

/**
 * Fire-and-forget analytics. If a PostHog key is set we POST to the capture
 * endpoint; otherwise we no-op (logging to console in dev) so the demo has zero
 * hard dependency on analytics.
 */
export function track(event: string, properties: Props = {}): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com";

  if (!key) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[analytics:stub]", event, properties);
    }
    return;
  }

  try {
    void fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        properties: { ...properties, $lib: "lotpilot-web" },
        timestamp: new Date().toISOString()
      }),
      keepalive: true
    });
  } catch {
    /* analytics must never break the demo */
  }
}
