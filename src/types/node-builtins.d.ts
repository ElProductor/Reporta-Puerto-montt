interface ByteBuffer extends Uint8Array {
  toString(encoding?: 'utf8' | 'hex' | 'base64' | 'base64url'): string;
  subarray(start?: number, end?: number): ByteBuffer;
  equals(otherBuffer: Uint8Array): boolean;
}

interface BufferConstructorLike {
  from(value: string, encoding?: 'utf8' | 'hex' | 'base64' | 'base64url'): ByteBuffer;
  from(value: readonly number[]): ByteBuffer;
  concat(list: readonly Uint8Array[]): ByteBuffer;
}

declare const Buffer: BufferConstructorLike;
declare const __dirname: string;

declare const process: {
  readonly env: Record<string, string | undefined>;
  readonly pid: number;
  readonly platform: string;
};

declare module 'node:http' {
  export interface IncomingMessage {
    readonly method?: string;
    readonly url?: string;
    readonly headers: Record<string, string | string[] | undefined>;
    readonly socket: { readonly remoteAddress?: string };
    on(event: 'data', listener: (chunk: ByteBuffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    destroy(): void;
  }

  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string>): this;
    setHeader(name: string, value: string): void;
    end(data?: string | Uint8Array): void;
  }

  export interface Server {
    listen(port: number, host: string, listeningListener?: () => void): this;
  }

  export function createServer(
    requestListener: (req: IncomingMessage, res: ServerResponse) => void,
  ): Server;
}

declare module 'node:fs' {
  export function mkdirSync(path: string, options?: { readonly recursive?: boolean }): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(
    path: string,
    data: string,
    options?: { readonly flag?: string; readonly mode?: number },
  ): void;
  export function readFile(path: string, callback: (err: Error | null, data: ByteBuffer) => void): void;

  export const promises: {
    writeFile(path: string, data: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
  };
}

declare module 'node:path' {
  export const sep: string;
  export function join(...paths: readonly string[]): string;
  export function resolve(...paths: readonly string[]): string;
  export function extname(path: string): string;
}

declare module 'node:crypto' {
  export interface HashLike {
    update(data: string): HashLike;
    digest(encoding: 'hex' | 'base64url'): string;
  }

  export function randomUUID(): string;
  export function randomBytes(size: number): ByteBuffer;
  export function createHash(algorithm: 'sha256'): HashLike;
  export function createHmac(algorithm: 'sha256', key: string): HashLike;
  export function scryptSync(password: string, salt: string, keylen: number): ByteBuffer;
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

declare module 'node:url' {
  export class URL {
    readonly pathname: string;
    readonly searchParams: {
      get(name: string): string | null;
    };
    constructor(input: string, base?: string);
  }
}
