/* @flow */
import Watcher from '../watcher/index.js'
import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving,
  Dep,
  pushTarget,
  popTarget
} from '../observer/index.js'

import {
  bind,
  noop,
  hasOwn,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering
} from '../utils/index.js'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function proxy (target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (gm) {
  gm._watchers = []
  const opts = gm.$options
  if (opts.props) initProps(gm, opts.props)
  if (opts.methods) initMethods(gm, opts.methods)
  if (opts.data) {
    initData(gm)
  } else {
    observe(gm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(gm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(gm, opts.watch)
  }
}

function initProps (gm, propsOptions) {
  const propsData = gm.$options.propsData || {}
  const props = gm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = gm.$options._propKeys = []
  const isRoot = !gm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, gm)
    defineReactive(props, key, value)
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in gm)) {
      proxy(gm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (gm) {
  let data = gm.$options.data
  data = gm._data = typeof data === 'function'
    ? getData(data, gm)
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = gm.$options.props
  const methods = gm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (props && hasOwn(props, key)) {
    } else if (!isReserved(key)) {
      proxy(gm, `_data`, key)
    }
  }
  // observe data
  observe(data, true /* asRootData */)
}

export function getData (data, gm) {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(gm, gm)
  } catch (e) {
    handleError(e, gm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

function initComputed (gm, computed) {
  // $flow-disable-line
  const watchers = gm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        gm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }
    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in gm)) {
      defineComputed(gm, key, userDef)
    }
  }
}

export function defineComputed (
  target,
  key,
  userDef
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (gm, methods) {
  const props = gm.$options.props
  for (const key in methods) {
    gm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], gm)
  }
}

function initWatch (gm, watch) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(gm, key, handler[i])
      }
    } else {
      createWatcher(gm, key, handler)
    }
  }
}

function createWatcher (
  gm,
  expOrFn,
  handler,
  options
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = gm[handler]
  }
  return gm.$watch(expOrFn, handler, options)
}

export function stateMixin (Gengine) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  Object.defineProperty(Gengine.prototype, '$data', dataDef)
  Object.defineProperty(Gengine.prototype, '$props', propsDef)

  Gengine.prototype.$set = set
  Gengine.prototype.$delete = del

  Gengine.prototype.$watch = function (
    expOrFn,
    cb,
    options
  ) {
    const gm = this
    if (isPlainObject(cb)) {
      return createWatcher(gm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(gm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(gm, watcher.value)
      } catch (error) {
        handleError(error, gm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
