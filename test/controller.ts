import {expect, fixture, html} from '@open-wc/testing'
import {replace, fake} from 'sinon'
import {controller} from '../src/controller.js'
import {attr} from '../src/attr.js'

describe('controller', () => {
  let instance

  it('calls register', async () => {
    @controller
    class ControllerRegisterElement extends HTMLElement {}
    instance = await fixture(html`<controller-register />`)
    expect(instance).to.be.instanceof(ControllerRegisterElement)
  })

  it('adds data-catalyst to elements', async () => {
    @controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ControllerDataAttrElement extends HTMLElement {}

    instance = await fixture(html`<controller-data-attr />`)
    expect(instance.hasAttribute('data-catalyst')).to.equal(true)
    expect(instance.getAttribute('data-catalyst')).to.equal('')
  })

  it('binds controllers before custom connectedCallback behaviour', async () => {
    @controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ControllerBindOrderElement extends HTMLElement {
      foo = fake()
    }
    @controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ControllerBindOrderSubElement extends HTMLElement {
      connectedCallback() {
        this.dispatchEvent(new CustomEvent('loaded'))
      }
    }
    instance = await fixture(html`
      <controller-bind-order>
        <controller-bind-order-sub data-action="loaded:controller-bind-order#foo" />
      </controller-bind-order>
    `)
    expect(instance.foo).to.have.callCount(1)
  })

  it('binds shadowRoots after connectedCallback behaviour', async () => {
    @controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ControllerBindShadowElement extends HTMLElement {
      connectedCallback() {
        this.attachShadow({mode: 'open'})
        const button = document.createElement('button')
        button.setAttribute('data-action', 'click:controller-bind-shadow#foo')
        this.shadowRoot.appendChild(button)
      }

      foo() {
        return 'foo'
      }
    }
    instance = await fixture(html`<controller-bind-shadow />`)
    replace(instance, 'foo', fake(instance.foo))

    instance.shadowRoot.querySelector('button').click()

    expect(instance.foo).to.have.callCount(1)
  })

  it('binds auto shadowRoots', async () => {
    @controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ControllerBindAutoShadowElement extends HTMLElement {
      foo() {
        return 'foo'
      }
    }
    instance = await fixture(html`
      <controller-bind-auto-shadow>
        <template data-shadowroot="open">
          <button data-action="click:controller-bind-auto-shadow#foo" />
        </template>
      </controller-bind-auto-shadow>
    `)
    replace(instance, 'foo', fake(instance.foo))

    expect(instance.shadowRoot).to.exist
    expect(instance).to.have.property('shadowRoot').not.equal(null)
    expect(instance.shadowRoot.children).to.have.lengthOf(1)
    instance.shadowRoot.querySelector('button').click()

    expect(instance.foo).to.have.callCount(1)
  })

  it('upgrades child decendants when connected', async () => {
    @controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ChildElementElement extends HTMLElement {}
    @controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class ParentElementElement extends HTMLElement {
      connectedCallback() {
        const child = this.querySelector('child-element')
        expect(child.matches(':defined')).to.equal(true)
      }
    }

    instance = await fixture(html`
      <parent-element>
        <child-element />
      </parent-element>
    `)
  })

  describe('attrs', () => {
    let attrValues = []
    @controller
    class AttributeTestElement extends HTMLElement {
      foo = 'baz'
      attributeChangedCallback() {
        attrValues.push(this.getAttribute('data-foo'))
        attrValues.push(this.foo)
      }
    }
    attr(AttributeTestElement.prototype, 'foo')

    beforeEach(() => {
      attrValues = []
    })

    it('initializes attrs as attributes in attributeChangedCallback', async () => {
      instance = await fixture(html`<attribute-test></attribute-test>`)
      instance.foo = 'bar'
      instance.attributeChangedCallback()
      expect(attrValues).to.eql(['bar', 'bar'])
    })

    it('initializes attributes as attrs in attributeChangedCallback', async () => {
      instance = await fixture(html`<attribute-test />`)
      instance.setAttribute('data-foo', 'bar')
      instance.attributeChangedCallback()
      expect(attrValues).to.eql(['bar', 'bar'])
    })
  })
})
