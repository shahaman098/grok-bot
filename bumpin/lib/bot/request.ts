export class BotRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Bound both the response and body read so the setup controls always recover. */
export async function requestBotJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    const data = await response.json();
    if (!response.ok)
      throw new BotRequestError(data.error ?? "Could not update connection. Please retry.", response.status);
    return data as T;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("This is taking too long. Check your connection and try again.");
    if (error instanceof BotRequestError) throw error;
    throw new Error("Could not reach BumpIn. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}
