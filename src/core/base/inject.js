/* @flow */
import { hasOwn, hasSymbol } from '../utils/index.js'
import { defineReactive, toggleObserving } from '../observer/index.js'

export function initProvide (gm) {
  const provide = gm.$options.provide
  if (provide) {
    gm._provided = typeof provide === 'function'
      ? provide.call(gm)
      : provide
  }
}

export function initInjections (gm) {
  const result = resolveInject(gm.$options.inject, gm)
  if (result) {
    toggleObserving(false)
    Object.keys(result).forEach((key) => {
      defineReactive(gm, key, result[key])
    })
    toggleObserving(true)
  }
}

export function resolveInject (inject, gm) {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      if (key === '__ob__') continue
      const provideKey = inject[key].from
      let source = gm
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(gm)
            : provideDefault
        }
      }
    }
    return result
  }
}
