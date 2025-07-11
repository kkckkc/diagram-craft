export type Writeable<T> = { -readonly [k in keyof T]: T[k] };

export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

export type DeepReadonly<T> = { +readonly [P in keyof T]: DeepReadonly<T[P]> };

export type DeepRequired<T> = { [P in keyof T]-?: DeepRequired<T[P]> };

export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };

export const makeWriteable = <T>(o: DeepReadonly<T>): DeepWriteable<T> => o as DeepWriteable<T>;

export const isEnum = <T extends string>(o: unknown, values: T[]): o is T => {
  return !(typeof o !== 'string' || !values.includes(o as T));
};

export type EmptyObject = Record<string, never>;

export type FlatObject = Record<string, string | number | boolean | undefined>;

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// eslint-disable-next-line
export type NestedObject = any;
