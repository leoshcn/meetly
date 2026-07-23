import { invokeCommand } from "../client";
import type { HealthResponse } from "../types";

export function appHealth(): Promise<HealthResponse> {
  return invokeCommand<HealthResponse>("app_health");
}
