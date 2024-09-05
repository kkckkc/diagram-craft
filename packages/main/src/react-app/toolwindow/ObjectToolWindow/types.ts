export type Property<V> = {
  val: V;
  set: (value: V | undefined) => void;
  hasMultipleValues: boolean;
  defaultVal: V;
  isSet: boolean;
};
