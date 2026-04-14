export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type CommandOptions = Record<string, string | boolean>;
export type ParsedArgv =
  | { help: true }
  | {
      command: string;
      options: CommandOptions;
    };

export type ReadTextFn = (filePath: string) => string;
export type RequestJsonFn = (
  method: string,
  urlString: string,
  options?: { payload?: JsonObject; timeout?: number },
) => Promise<JsonValue>;
export type WriteFn = (text: string) => void;
