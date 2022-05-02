import type {Ability} from './ability.js'
import {register, add} from './tag-observer.js'
import {observeProperty} from './observe-property.js'
import {createMark} from './mark.js'
import {createAbility, attachShadowCallback} from './ability.js'
import {mustDasherize} from './dasherize.js'

const [target, getTarget] = createMark((key: PropertyKey) => mustDasherize(key, '@target'))
const [targets, getTargets] = createMark((key: PropertyKey) => mustDasherize(key, '@targets'))
export {target, getTarget, targets, getTargets}

function setTarget(el: Element, controller: Element | ShadowRoot, tag: string, key: string): void {
  const get = tag === 'data-targets' ? getTargets : getTarget
  if (controller instanceof ShadowRoot) {
    controller = controllers.get(controller)!
  }
  if (controller && get(controller!)?.has(key)) (controller as unknown as Record<string, unknown>)[key] = {}
}

register('data-target', (str: string) => str.split('.'), setTarget)
register('data-targets', (str: string) => str.split('.'), setTarget)
const shadows = new WeakMap<Ability, ShadowRoot>()
const controllers = new WeakMap<ShadowRoot, Ability>()

const findTarget = (controller: Ability, selector: string, many: boolean) => () => {
  const nodes = []
  const shadow = shadows.get(controller)
  if (shadow) {
    for (const el of shadow.querySelectorAll(selector)) {
      if (!el.closest(controller.tagName)) {
        if (!many) return el
        nodes.push(el)
      }
    }
  }
  for (const el of controller.querySelectorAll(selector)) {
    if (el.closest(controller.tagName) === controller) {
      if (!many) return el
      nodes.push(el)
    }
  }
  if (many) return nodes
}

export const targetable = createAbility(
  Class =>
    class extends Class {
      connectedCallback() {
        add(this)
        super.connectedCallback?.()
        for (const key of getTarget(this)) {
          const find = findTarget(this, `[data-target~="${this.tagName.toLowerCase()}.${String(key)}"]`, false)
          observeProperty(this as unknown as Record<PropertyKey, unknown>, key, {
            get: find,
            set: find
          })
        }
        for (const key of getTargets(this)) {
          const find = findTarget(this, `[data-targets~="${this.tagName.toLowerCase()}.${String(key)}"]`, true)
          observeProperty(this as unknown as Record<PropertyKey, unknown>, key, {
            get: find,
            set: find
          })
        }
      }

      [attachShadowCallback](root: ShadowRoot) {
        super[attachShadowCallback]?.(root)
        shadows.set(this, root)
        controllers.set(root, this)
        add(root)
      }
    }
)
