export const getPropertyDescriptor = (instance: unknown, key: PropertyKey): PropertyDescriptor | undefined => {
  let node = instance
  while (node) {
    const descriptor = Object.getOwnPropertyDescriptor(node, key)
    if (descriptor && (descriptor.get || descriptor.set)) return descriptor
    node = Object.getPrototypeOf(node)
  }
}