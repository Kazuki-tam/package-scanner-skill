export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

export function fail(message: string): never {
  throw new CliError(message);
}
