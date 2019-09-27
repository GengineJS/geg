/* @flow */

import {
  toArray
} from '../utils/tools.js'
import { invokeWithErrorHandling } from '../utils/error.js'
import { updateListeners } from '../gdom/helpers/update-listeners.js'

export function initEvents (gm) {
  gm._events = Object.create(null)
  gm._hasHookEvent = false
  // init parent attached events
  const listeners = gm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(gm, listeners)
  }
}

let target
function add (event, fn) {
  target.$on(event, fn)
}

function remove (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

export function updateComponentListeners (
  gm,
  listeners,
  oldListeners
) {
  target = gm
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, gm)
  target = undefined
}

export function eventsMixin (Gengine) {
  const hookRE = /^hook:/
  Gengine.prototype.$on = function (event, fn) {
    const gm = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        gm.$on(event[i], fn)
      }
    } else {
      (gm._events[event] || (gm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        gm._hasHookEvent = true
      }
    }
    return gm
  }

  Gengine.prototype.$once = function (event, fn) {
    const gm = this
    function on () {
      gm.$off(event, on)
      fn.apply(gm, arguments)
    }
    on.fn = fn
    gm.$on(event, on)
    return gm
  }

  Gengine.prototype.$off = function (event, fn) {
    const gm = this
    // all
    if (!arguments.length) {
      gm._events = Object.create(null)
      return gm
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        gm.$off(event[i], fn)
      }
      return gm
    }
    // specific event
    const cbs = gm._events[event]
    if (!cbs) {
      return gm
    }
    if (!fn) {
      gm._events[event] = null
      return gm
    }
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return gm
  }

  Gengine.prototype.$emit = function (event) {
    const gm = this
    let cbs = gm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], gm, args, gm, info)
      }
    }
    return gm
  }
}
