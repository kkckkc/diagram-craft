export const applyTemplate = (text: string, props: Data) => {
  for (const match of text.matchAll(/%(\w+)%/g)) {
    const key = match[1];
    const value = props[key];
    text = text.replace(match[0], value ? value.toString() : '');
  }
  return text;
};
