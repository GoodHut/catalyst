import {getPropertyDescriptor} from "./get-property-descriptor"

export const observeProperty = <K extends PropertyKey, T>(
  instance: Record<K, T>,
  key: K,
  {
    get,
    set
  }: {
    get?: (value: T) => T
    set?: (newValue: T) => T
  } = {}
): T => {
  let value = instance[key]
  const base = getPropertyDescriptor(instance, key)
  Object.defineProperty(instance, key, {
    get() {
      if (get) value = get(value)
      if (base && base.get) value = base.get.call(instance)
      return value
    },
    set: (newValue: T) => {
      value = newValue
      if (set) value = set(newValue)
      if (base && base.set) base.set.call(instance, value)
    }
  })
  return value
}
