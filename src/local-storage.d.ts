declare module 'local-storage' {
  export function get(key: string): string | undefined;
  export function set(key: string, value: string): string | undefined;
}