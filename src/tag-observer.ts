type Parse = (str: string) => string[]
type Found = (el: Element, controller: Element | ShadowRoot, tag: string, ...parsed: string[]) => void

export const tags = (el: Element, tag: string, parse: Parse) =>
  (el.getAttribute(tag) || '').trim().split(/\s+/g).map(parse)

const registry = new Map<string, [Parse, Found]>()
const observer = new MutationObserver((mutations: MutationRecord[]) => {
  for (const mutation of mutations) {
    if (mutation.target instanceof Element) {
      const tag = mutation.attributeName!
      const el = mutation.target
      if (registry.has(tag)) {
        const [parse, found] = registry.get(tag)!
        for (const [tagName, ...meta] of tags(el, tag, parse)) {
          let controller: Element | ShadowRoot | null = el.closest(tagName)
          if (!controller) {
            controller = el.getRootNode() as ShadowRoot
            if (!(controller instanceof ShadowRoot)) continue
          }
          found(mutation.target, controller, tag, ...meta)
        }
      }
    } else if (mutation.addedNodes.length) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) add(node)
      }
    }
  }
})

export const register = (tag: string, parse: Parse, found: Found) => {
  if (registry.has(tag)) throw new Error('duplicate tag')
  registry.set(tag, [parse, found])
}

export const add = (root: Element | ShadowRoot) => {
  for (const [tag, [parse, found]] of registry) {
    for (const el of root.querySelectorAll(`[${tag}]`)) {
      for (const [tagName, ...meta] of tags(el, tag, parse)) {
        let controller: Element | ShadowRoot | null = el.closest(tagName)
        if (!controller) {
          controller = el.getRootNode() as ShadowRoot
          if (!(controller instanceof ShadowRoot)) continue
        }
        found(el, controller, tag, ...meta)
      }
    }
    if (root instanceof Element && root.hasAttribute(tag)) {
      for (const [tagName, ...meta] of tags(root, tag, parse)) {
        let controller: Element | ShadowRoot | null = root.closest(tagName)
        if (!controller) {
          controller = root.getRootNode() as ShadowRoot
          if (!(controller instanceof ShadowRoot)) continue
        }
        found(root, controller, tag, ...meta)
      }
    }
  }
  observer.observe(root instanceof Element ? root.ownerDocument : root, {
    childList: true,
    subtree: true,
    attributeFilter: Array.from(registry.keys())
  })
}
