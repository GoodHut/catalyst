import type {Ability} from './ability.js'
import {mustDasherize} from './dasherize.js'
import {createMark} from './mark.js'
import {requestUpdate, createAbility} from './ability.js'
import {observeProperty} from './observe-property.js'

const [attr, getAttrs] = createMark((key: PropertyKey) => mustDasherize(key, '@attr'))
export {attr, getAttrs}

const initial = Symbol()
let setFromMutation = false
const attrs = new WeakMap<Ability, Map<string, PropertyKey>>()
const handleMutations = (mutations: MutationRecord[]) => {
  for (const mutation of mutations) {
    if (mutation.type === 'attributes') {
      const name = mutation.attributeName!
      const el = mutation.target as unknown as Ability
      const key = attrs.get(el)?.get(name)
      if (key) {
        setFromMutation = true
        ;(el as unknown as Record<PropertyKey, unknown>)[key] = el.hasAttribute(name) ? el.getAttribute(name) : initial
        setFromMutation = false
      }
    }
  }
}
const observer = new MutationObserver(handleMutations)
const Identity = (v: unknown) => v

export const attrable = createAbility(
  Class =>
    class extends Class {
      constructor() {
        super()
        const attributeNames = new Map<string, PropertyKey>()
        attrs.set(this, attributeNames)
        for (const key of getAttrs(this)) {
          const name = mustDasherize(key)
          attributeNames.set(name, key)
          let cast: typeof Identity = null!
          const descriptor = {
            get: (value: unknown) => {
              if (!cast) {
                if (typeof value === 'number') {
                  cast = Number
                } else if (typeof value === 'boolean') {
                  cast = Boolean
                } else if (typeof value === 'string') {
                  cast = String
                } else {
                  cast = Identity
                }
              }
              const has = this.hasAttribute(name)
              if (has) return cast === Boolean ? has : cast(this.getAttribute(name)!)
              return cast(value)
            },
            set: (newValue: unknown) => {
              newValue = newValue === initial ? initialValue : cast(newValue)
              if (!setFromMutation) {
                if (cast === Boolean) {
                  this.toggleAttribute(name, newValue as boolean)
                } else {
                  this.setAttribute(name, newValue as string)
                }
              }
              requestUpdate(this)
              return newValue
            }
          }
          const initialValue = observeProperty(this as Record<PropertyKey, unknown>, key, descriptor)
        }
        observer.observe(this, {attributeFilter: Array.from(attributeNames.keys())})
      }

      connectedCallback() {
        for (const key of getAttrs(this)) {
          ;(this as unknown as Record<PropertyKey, unknown>)[key] = (this as unknown as Record<PropertyKey, unknown>)[
            key
          ]
        }
        super.connectedCallback?.()
      }
    }
)
