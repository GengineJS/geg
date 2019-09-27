/* @flow */
import { initState } from './state.js'
import { initRender } from './render.js'
import { initEvents } from './events.js'
import { initLifecycle, callHook } from './lifecycle.js'
import { initProvide, initInjections } from './inject.js'
import { mergeOptions } from '../utils/index.js'
import { resolveConstructorOptions } from './resove-options.js'
// import Compile from '../compile/html/index.js'
let uid = 0
export function initMixin (Gengine) {
  Gengine.prototype._init = function (options, isSub) {
    const gm = this
    // a uid
    gm._uid = uid++
    // a flag to avoid this being observed
    gm._isGengine = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(gm, options)
    } else {
      gm.$options = mergeOptions(
        resolveConstructorOptions(gm.constructor),
        options || {},
        gm
      )
    }
    gm._renderProxy = gm
    // expose real self
    gm._self = gm
    initLifecycle(gm)
    initEvents(gm)
    initRender(gm)
    callHook(gm, 'beforeCreate')
    initInjections(gm) // resolve injections before data/props
    initState(gm)
    initProvide(gm) // resolve provide after data/props
    callHook(gm, 'created')
    if ((gm.$options.el || gm.$options.template) && !isSub) {
      gm.$mount(gm.$options.el)
      // this.$compile = new Compile(options.el || document.body, this)
    }
  }
}

export function initInternalComponent (gm, options) {
  const opts = gm.$options = Object.create(gm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
