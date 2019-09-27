/* @flow */
import {
  emptyObject,
  handleError,
  nextTick
} from '../utils/index.js'
import { defineReactive } from '../observer/index.js'
import { createElement } from '../gdom/create.js'
import { VNode, createEmptyVNode } from '../gdom/vnode.js'
import { normalizeScopedSlots } from '../gdom/helpers/normalize-scoped-slots.js'
import { installRenderHelpers } from './render-helpers/index.js'
import { resolveSlots } from './render-helpers/resolve-slots.js'
import { applyCurrentRenderingInstance } from './render-instance.js'
export function initRender (gm) {
  gm._vnode = null // the root of the child tree
  gm._staticTrees = null // v-once cached trees
  const options = gm.$options
  const parentVnode = gm.$vnode = options._parentVnode // the placeholder node in parent tree
  const renderContext = parentVnode && parentVnode.context
  gm.$slots = resolveSlots(options._renderChildren, renderContext)
  gm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  gm._c = (a, b, c, d) => createElement(gm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  gm.$createElement = (a, b, c, d) => createElement(gm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data
  defineReactive(gm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
  defineReactive(gm, '$listeners', options._parentListeners || emptyObject, null, true)
}
// for testing only
export function setCurrentRenderingInstance (gm) {
  applyCurrentRenderingInstance(gm)
}

export function renderMixin (Gengine) {
  // install runtime convenience helpers
  installRenderHelpers(Gengine.prototype)

  Gengine.prototype.$nextTick = function (fn) {
    return nextTick(fn, this)
  }

  Gengine.prototype._render = function () {
    const gm = this
    const { render, _parentVnode } = gm.$options
    if (_parentVnode) {
      gm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        gm.$slots,
        gm.$scopedSlots
      )
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    gm.$vnode = _parentVnode
    // render self
    let vnode
    try {
      // There's no need to maintain a stack because all render fns are called
      // separately from one another. Nested component's render fns are called
      // when parent component is patched.
      applyCurrentRenderingInstance(gm)
      vnode = render.call(gm._renderProxy, gm.$createElement)
    } catch (e) {
      handleError(e, gm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      vnode = gm._vnode
    } finally {
      applyCurrentRenderingInstance(null)
    }
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
}
