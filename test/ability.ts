import {expect, fixture, html} from '@open-wc/testing'
import {createAbility} from '../src/ability.js'

describe('ability', () => {
  const calls = new Set()
  const fakeable = createAbility(
    Class =>
      class extends Class {
        foo() {
          return 'foo!'
        }
        connectedCallback() {
          calls.add('fakeable connectedCallback')
          super.connectedCallback?.()
        }
        disconnectedCallback() {
          calls.add('fakeable disconnectedCallback')
          super.disconnectedCallback?.()
        }
        adoptedCallback() {
          calls.add('fakeable adoptedCallback')
          super.adoptedCallback?.()
        }
        attributeChangedCallback(...args) {
          calls.add('fakeable attributeChangedCallback')
          super.attributeChangedCallback?.(...args)
        }
      }
  )
  const otherfakeable = createAbility(
    Class =>
      class extends Class {
        bar() {
          return 'bar!'
        }
        connectedCallback() {
          calls.add('otherfakeable connectedCallback')
          super.connectedCallback?.()
        }
        disconnectedCallback() {
          calls.add('otherfakeable disconnectedCallback')
          super.disconnectedCallback?.()
        }
        adoptedCallback() {
          calls.add('otherfakeable adoptedCallback')
          super.adoptedCallback?.()
        }
        attributeChangedCallback(...args) {
          calls.add('otherfakeable attributeChangedCallback')
          super.attributeChangedCallback?.(...args)
        }
      }
  )
  class Element extends HTMLElement {
    connectedCallback() {}
    disconnectedCallback() {}
    adoptedCallback() {}
    attributeChangedCallback() {}
  }

  afterEach(() => restore())

  it('creates a function, which creates a subclass of the given class', async () => {
    const DElement = fakeable(Element)
    expect(DElement).to.have.property('prototype').instanceof(Element)
  })

  it('can be used in decorator position', async () => {
    @fakeable
    class DElement extends HTMLElement {}

    expect(DElement).to.have.property('prototype').instanceof(HTMLElement)
  })

  it('can be called multiple times without extending the inheritance chain', async () => {
    const DElement = fakeable(Element)
    expect(Element).to.not.equal(DElement)
    const D2Element = otherfakeable(DElement)
    expect(DElement).to.not.equal(D2Element)
    expect(DElement).to.have.property('prototype').be.instanceof(Element)
    expect(D2Element).to.have.property('prototype').be.instanceof(Element)
  })

  describe('subclass behaviour', () => {
    const CoreTest = otherfakeable(fakeable(Element))
    customElements.define('core-test', CoreTest)

    let instance
    beforeEach(async () => {
      instance = await fixture(html`<core-test />`)
    })

    it('applies keys from delegate onto subclass upon instantiation', () => {
      expect(instance).to.have.property('foo')
      expect(instance.foo()).to.equal('foo!')
      expect(instance).to.have.property('bar')
      expect(instance.bar()).to.equal('bar!')
    })

    for (const method of ['connectedCallback', 'disconnectedCallback', 'adoptedCallback', 'attributeChangedCallback']) {
      it(`delegates to other ${method}s before class ${method}`, () => {
        calls.clear()
        instance[method]()
        expect(Array.from(calls)).to.eql([`otherfakeable ${method}`, `fakeable ${method}`])
      })
    }
  })

  describe('ability extension behaviour', () => {
    describe('attachShadowCallback', () => {
      it('is called with shadowRoot of declarative ShadowDOM')

      it('is called with shadowRoot from attachShadow call')

      it('is called with shadowRoot from attachInternals call')

      it('is called with shadowRoot from connectedCallback')
    })
    describe('attachInternalsCallback', () => {
      it('is called on constructor')

      it('does not prevent attachInternals being called by userland class')
    })
    describe('updateCallback', () => {
      it('is called after a microtask from connectedCallback')

      it('is called after a microtask from attributeChangedCallback')
    })
  })
})
