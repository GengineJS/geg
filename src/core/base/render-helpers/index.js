/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from '../../utils/index.js'
import { createTextVNode, createEmptyVNode } from '../../gdom/vnode.js'
import { renderList } from './render-list.js'
import { renderSlot } from './render-slot.js'
import { resolveFilter } from './resolve-filter.js'
import { checkKeyCodes } from './check-keycodes.js'
import { bindObjectProps } from './bind-object-props.js'
import { renderStatic, markOnce } from './render-static.js'
import { bindObjectListeners } from './bind-object-listeners.js'
import { resolveScopedSlots } from './resolve-scoped-slots.js'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys.js'

export function installRenderHelpers (target) {
  target._o = markOnce
  target._n = toNumber
  target._s = toString
  target._l = renderList
  target._t = renderSlot
  target._q = looseEqual
  target._i = looseIndexOf
  target._m = renderStatic
  target._f = resolveFilter
  target._k = checkKeyCodes
  target._b = bindObjectProps
  target._v = createTextVNode
  target._e = createEmptyVNode
  target._u = resolveScopedSlots
  target._g = bindObjectListeners
  target._d = bindDynamicKeys
  target._p = prependModifier
}
