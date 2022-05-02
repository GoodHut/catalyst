type PropertyDecorator = (proto: object, key: PropertyKey) => void
type GetMarks = (proto: object) => Set<PropertyKey>
export function createMark(validate: (key: PropertyKey) => void): [PropertyDecorator, GetMarks] {
  const marks = new WeakMap<object, Set<PropertyKey>>()
  const sym = Symbol()
  function get(proto: object): Set<PropertyKey> {
    if (!marks.has(proto)) {
      const parent = Object.getPrototypeOf(proto)
      marks.set(proto, new Set(marks.get(parent) || []))
    }
    return marks.get(proto)!
  }
  const marker = (proto: object, key: PropertyKey): void => {
    validate(key)
    get(proto).add(key)
  }
  marker.static = sym
  return [
    marker,
    (instance: object): Set<PropertyKey> =>
      new Set([
        ...get(Object.getPrototypeOf(instance)),
        ...((instance.constructor as unknown as Record<symbol, PropertyKey[]>)?.[sym] || [])
      ])
  ]
}
