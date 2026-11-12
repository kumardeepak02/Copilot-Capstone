import { randomUUID } from "node:crypto";
import { closeSync, fsyncSync, openSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArchivePublisher } from "../../core/src/ports.js";

export class FileArchives implements ArchivePublisher {
  private readonly directory: string;
  constructor(privateDirectory: string) { this.directory = privateDirectory; }
  publish(archive: Buffer, prepared: () => void): string {
    const id = `${randomUUID()}.backup`;
    const staged = join(this.directory, `${id}.staged`);
    const descriptor = openSync(staged, "wx", 0o600);
    try {
      writeFileSync(descriptor, archive);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    prepared();
    renameSync(staged, join(this.directory, id));
    return id;
  }
}
