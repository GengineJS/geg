import Compile from '../compile/html/index.js'
import { observe } from '../observer/index.js'
import Watcher from '../watcher/index.js'
import configurable from '../config/index.js'
import { initMixin } from './init.js'
import { renderMixin } from './render.js'
import { stateMixin } from './state.js'
import { eventsMixin } from './events.js'
import { lifecycleMixin } from './lifecycle.js'
export class BaseInterface {
    constructor (options) {
        this._init(options)
    }
    _init(options) {
        this.$options = options || {}
        let data = this._data = this.$options.data
        let me = this
        // 数据代理
        // 实现 vm.xxx -> vm._data.xxx
        Object.keys(data).forEach(function(key) {
            me._proxyData(key)
        })

        this._initComputed()

        observe(data, this)

        this.$compile = new Compile(options.el || document.body, this)
    }
    $watch(key, cb, options) {
        new Watcher(this, key, cb)
    }

    _proxyData(key, setter, getter) {
        let me = this
        setter = setter ||
            Object.defineProperty(me, key, {
                configurable: false,
                enumerable: true,
                get: function proxyGetter() {
                    return me._data[key]
                },
                set: function proxySetter(newVal) {
                    me._data[key] = newVal
                }
            })
    }

    _initComputed() {
        let me = this
        let computed = this.$options.computed
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function'
                        ? computed[key]
                        : computed[key].get,
                    set: function() {}
                })
            })
        }
    }
}
export default class Gengine extends BaseInterface {
    constructor(options) {
        super(options)
    }
}
configurable(Gengine)
initMixin(Gengine)
stateMixin(Gengine)
eventsMixin(Gengine)
lifecycleMixin(Gengine)
renderMixin(Gengine)
