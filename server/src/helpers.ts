export function mapAppend<K, V>(map: Map<K, V[]>, key: K, ...value: V[]) {
  const values = map.get(key) ?? [];
  values.push(...value);
  map.set(key, values);
}
