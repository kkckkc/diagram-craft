/**
 * Shortens a string to a specified length and appends '...' if the string is longer than the specified length.
 *
 * @param str - The string to be shortened.
 * @param length - The maximum length of the shortened string.
 * @returns The shortened string, or the original string if it's shorter than the specified length.
 */
export const shorten = (str: string, length: number) => {
  if (length < 0) return str;
  if (str.length <= length) return str;

  return str.substring(0, length) + '...';
};

/**
 * Returns the first string that is not undefined, null or empty from the provided arguments.
 *
 * @param args - The strings to be checked.
 * @returns The first string that is not undefined, null or empty, or undefined if all strings are undefined, null or empty.
 *
 * @example
 * // returns "Hello"
 * coalesce(undefined, "Hello", "World");
 *
 * @example
 * // returns undefined
 * coalesce(undefined, null, "");
 */
export const coalesce = (...args: (string | undefined | null)[]) =>
  args.find(a => !isEmptyString(a));

/**
 * Returns true if the provided string is null, undefined or empty.
 * @param s - The string to be checked.
 * @returns True if the provided string is null, undefined or empty, false otherwise.
 */
export const isEmptyString = (s: string | undefined | null) =>
  s === null || s === undefined || s.trim() === '';

/**
 * Pads the given string on the right side with a specified character(s) until it reaches the desired length.
 *
 * If the string's length is already greater than or equal to the specified length, no padding is added.
 * The default padding character is a single space (' ').
 *
 * @param {string} str - The string to be padded on the right.
 * @param {number} length - The target length of the resulting string after padding.
 * @param {string} [pad=' '] - The character(s) to use for padding. Defaults to a single space.
 * @returns {string} The string padded on the right to the desired length.
 */
export const padRight = (str: string, length: number, pad = ' ') => {
  while (str.length < length) {
    str += pad;
  }
  return str;
};
