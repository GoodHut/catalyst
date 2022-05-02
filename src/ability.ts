import type {CustomElementClass, CustomElement} from './custom-element.js'

export interface Ability extends CustomElement {
  [updateCallback]?(): void
  [attachShadowCallback]?(shadowRoot: ShadowRoot): void
  [attachInternalsCallback]?(internals: ElementInternals): void
}

export interface AbilityClass {
  new (): Ability
  observedAttributes?: string[]
  formAssociated?: boolean
}

export const updateCallback = Symbol()
export const attachShadowCallback = Symbol()
export const attachInternalsCallback = Symbol()

const abilityMarkers = new WeakMap<AbilityClass, Set<symbol>>()
export const createAbility = (decorate: (Class: AbilityClass) => AbilityClass) => {
  const marker = Symbol()
  return (Class: AbilityClass): AbilityClass => {
    if (!abilityMarkers.has(Class)) {
      Class = abilityable(Class)
      abilityMarkers.set(Class, new Set())
    }
    const markers = abilityMarkers.get(Class)!
    return markers.has(marker) ? (Class as AbilityClass) : decorate(Class as AbilityClass)
  }
}

const requestTask = (cb: () => void): (() => void) => {
  let cancelled = false
  ;(async () => {
    await Promise.resolve()
    cancelled || cb()
  })()
  return () => {
    cancelled = true
  }
}

const cancels = new WeakMap<Ability, () => void>()
export const requestUpdate = (instance: Ability) => {
  if (instance.isConnected) {
    cancels.get(instance)?.()
    cancels.set(
      instance,
      requestTask(() => instance[updateCallback]?.())
    )
  }
}

const shadows = new WeakMap<Ability, ShadowRoot | null>()
const requestAttachShadow = (instance: Ability, shadowRoot: ShadowRoot | null) => {
  if (shadowRoot && shadowRoot !== shadows.get(instance)) {
    shadows.set(instance, shadowRoot)
    instance[attachShadowCallback]?.(shadowRoot)
  }
}

const internals = new WeakMap<Ability, ElementInternals>()
const internalsAttached = new WeakSet<Ability>()
const baseAttachInternals = HTMLElement.prototype.attachInternals
const requestInternals = (instance: Ability, internal = false): ElementInternals | undefined => {
  if (!internals.has(instance)) {
    try {
      internals.set(instance, baseAttachInternals.call(instance))
    } catch {
      return
    }
  }
  if (internal) return internals.get(instance)
  if (!internalsAttached.has(instance)) return internals.get(instance)!
  internalsAttached.add(instance)
  return baseAttachInternals.call(instance)
}

const abilityable = (Class: AbilityClass): AbilityClass =>
  class extends Class {
    constructor() {
      super()
      const elementInternals = requestInternals(this, true)
      let shadowRoot = this.shadowRoot
      if (elementInternals) {
        this[attachInternalsCallback]?.(elementInternals)
        if (elementInternals.shadowRoot) shadowRoot = elementInternals.shadowRoot
      }
      requestAttachShadow(this, shadowRoot)
    }

    connectedCallback() {
      super.connectedCallback?.()
      this.setAttribute('c-controller', '')
      requestUpdate(this)
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
      super.attributeChangedCallback?.(name, oldValue, newValue)
      requestUpdate(this)
    }

    attachShadow(...args: [init: ShadowRootInit]): ShadowRoot {
      const shadowRoot = super.attachShadow(...args)
      requestAttachShadow(this, shadowRoot)
      return shadowRoot
    }

    attachInternals(): ElementInternals {
      return requestInternals(this)!
    }
  }
