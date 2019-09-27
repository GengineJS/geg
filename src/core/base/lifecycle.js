/* @flow */
import Watcher from '../watcher/index.js'
import { createEmptyVNode } from '../gdom/vnode.js'
import { updateComponentListeners } from './events.js'
import { resolveSlots } from './render-helpers/resolve-slots.js'
import { toggleObserving } from '../observer/observer.js'
import { validateProp } from '../utils/props.js'
import { noop, remove, emptyObject } from '../utils/tools.js'
import { callHook } from './active.js'
export * from './active.js'
export let activeInstance = null
export let isUpdatingChildComponent = false
export function setActiveInstance(gm) {
  const prevActiveInstance = activeInstance
  activeInstance = gm
  return () => {
    activeInstance = prevActiveInstance
  }
}

export function initLifecycle (gm) {
  const options = gm.$options

  // locate first non-abstract parent
  let parent = options.parent
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(gm)
  }

  gm.$parent = parent
  gm.$root = parent ? parent.$root : gm

  gm.$children = []
  gm.$refs = {}

  gm._watcher = null
  gm._inactive = null
  gm._directInactive = false
  gm._isMounted = false
  gm._isDestroyed = false
  gm._isBeingDestroyed = false
}

export function lifecycleMixin (Gengine) {
  Gengine.prototype._update = function (vnode, hydrating) {
    const gm = this
    const prevEl = gm.$el
    const prevVnode = gm._vnode
    const restoreActiveInstance = setActiveInstance(gm)
    gm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      gm.$el = gm.__patch__(gm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      gm.$el = gm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__gengine__ = null
    }
    if (gm.$el) {
      gm.$el.__gengine__ = gm
    }
    // if parent is an HOC, update its $el as well
    if (gm.$vnode && gm.$parent && gm.$vnode === gm.$parent._vnode) {
      gm.$parent.$el = gm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  Gengine.prototype.$forceUpdate = function () {
    const gm = this
    if (gm._watcher) {
      gm._watcher.update()
    }
  }

  Gengine.prototype.$destroy = function () {
    const gm = this
    if (gm._isBeingDestroyed) {
      return
    }
    callHook(gm, 'beforeDestroy')
    gm._isBeingDestroyed = true
    // remove self from parent
    const parent = gm.$parent
    if (parent && !parent._isBeingDestroyed && !gm.$options.abstract) {
      remove(parent.$children, gm)
    }
    // teardown watchers
    if (gm._watcher) {
      gm._watcher.teardown()
    }
    let i = gm._watchers.length
    while (i--) {
      gm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (gm._data.__ob__) {
      gm._data.__ob__.gmCount--
    }
    // call the last hook...
    gm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    gm.__patch__(gm._vnode, null)
    // fire destroyed hook
    callHook(gm, 'destroyed')
    // turn off all instance listeners.
    gm.$off()
    // remove __vue__ reference
    if (gm.$el) {
      gm.$el.__gengine__ = null
    }
    // release circular reference (#6759)
    if (gm.$vnode) {
      gm.$vnode.parent = null
    }
  }
}

export function mountComponent (
  gm,
  el,
  hydrating
) {
  gm.$el = el
  if (!gm.$options.render) {
    gm.$options.render = createEmptyVNode
  }
  callHook(gm, 'beforeMount')
  /* istanbul ignore if */
  let updateComponent = () => {
    gm._update(gm._render(), hydrating)
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  new Watcher(gm, updateComponent, noop, {
    before () {
      if (gm._isMounted && !gm._isDestroyed) {
        callHook(gm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (gm.$vnode == null) {
    gm._isMounted = true
    callHook(gm, 'mounted')
  }
  return gm
}

export function updateChildComponent (
  gm,
  propsData,
  listeners,
  parentVnode,
  renderChildren
) {
  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = gm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && gm.$scopedSlots.$key !== newScopedSlots.$key)
  )
  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren ||               // has new static slots
    gm.$options._renderChildren ||  // has old static slots
    hasDynamicScopedSlot
  )

  gm.$options._parentVnode = parentVnode
  gm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (gm._vnode) { // update child tree's parent
    gm._vnode.parent = parentVnode
  }
  gm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  gm.$attrs = parentVnode.data.attrs || emptyObject
  gm.$listeners = listeners || emptyObject

  // update props
  if (propsData && gm.$options.props) {
    toggleObserving(false)
    const props = gm._props
    const propKeys = gm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions = gm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, gm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    gm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = gm.$options._parentListeners
  gm.$options._parentListeners = listeners
  updateComponentListeners(gm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    gm.$slots = resolveSlots(renderChildren, parentVnode.context)
    gm.$forceUpdate()
  }
}
