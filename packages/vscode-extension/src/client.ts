import { AppError } from "../../core/src/security.js";
import type { JobService } from "../../core/src/jobs.js";

export interface ClientUi {
  password(): Promise<string | undefined>;
  show(code: string): void;
}
export async function resumeWithPrompt(service: JobService, id: string, ui: ClientUi): Promise<void> {
  const { job } = await service.execute("readAnyJob", { id });
  if (!job) throw new AppError("NOT_FOUND");
  let password: string | undefined;
  if (job.state === "AWAITING_PASSWORD") password = await ui.password();
  try {
    const result = await service.execute("resumeJob", {
      id, ...(password ? { password, challengeId: job.challengeId } : {}),
    });
    if (!result.job) throw new AppError("STORAGE_UNAVAILABLE");
    ui.show(result.job.code);
  } finally {
    password = undefined;
  }
}
