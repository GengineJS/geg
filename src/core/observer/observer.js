import { def } from '../utils/lang.js'
import { protoAugment, copyAugment } from './augement.js'
import { arrayMethods } from './array.js'
import { hasProto } from '../utils/env.js'
import { Dep } from './dep.js'
import { isObject, hasOwn, isPlainObject, isValidArrayIndex } from '../utils/tools.js'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)
export let shouldObserve = true
export function toggleObserving (value) {
    shouldObserve = value
}
/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target, key, val) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.length = Math.max(target.length, key)
        target.splice(key, 1, val)
        return val
    }
    if (key in target && !(key in Object.prototype)) {
        target[key] = val
        return val
    }
    const ob = target.__ob__
    if (target._isGengine || (ob && ob.gmCount)) {
        return val
    }
    if (!ob) {
        target[key] = val
        return val
    }
    defineReactive(ob.value, key, val)
    ob.dep.notify()
    return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target, key) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.splice(key, 1)
        return
    }
    const ob = target.__ob__
    if (target._isGengine || (ob && ob.gmCount)) {
        return
    }
    if (!hasOwn(target, key)) {
        return
    }
    delete target[key]
    if (!ob) {
        return
    }
    ob.dep.notify()
}
/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value) {
    for (let e, i = 0, l = value.length; i < l; i++) {
        e = value[i]
        e && e.__ob__ && e.__ob__.dep.depend()
        if (Array.isArray(e)) {
            dependArray(e)
        }
    }
}
/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
    obj,
    key,
    val,
    customSetter,
    shallow
) {
    const dep = new Dep()
    const property = Object.getOwnPropertyDescriptor(obj, key)
    if (property && property.configurable === false) {
        return
    }
    // cater for pre-defined getter/setters
    const getter = property && property.get
    const setter = property && property.set
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key]
    }

    let childOb = !shallow && observe(val)
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: () => {
            const value = getter ? getter.call(obj) : val
            if (Dep.target) {
                dep.depend()
                if (childOb) {
                    childOb.dep.depend()
                    if (Array.isArray(value)) {
                        dependArray(value)
                    }
                }
            }
            return value
        },
        set: (newVal) => {
            const value = getter ? getter.call(obj) : val
            /* eslint-disable no-self-compare */
            if (newVal === value || (newVal !== newVal && value !== value)) {
                return
            }
            /* eslint-enable no-self-compare */
            if (customSetter) {
                customSetter()
            }
            // #7981: for accessor properties without setter
            if (getter && !setter) return
            if (setter) {
                setter.call(obj, newVal)
            } else {
                val = newVal
            }
            childOb = !shallow && observe(newVal)
            dep.notify()
        }
    })
}

export class Observer {
    constructor(value) {
        this.value = value
        this.dep = new Dep()
        this.gmCount = 0
        def(value, '__ob__', this)
        if (Array.isArray(value)) {
            if (hasProto) {
                protoAugment(value, arrayMethods)
            } else {
                copyAugment(value, arrayMethods, arrayKeys)
            }
            this.observeArray(value)
        } else {
            this.walk(value)
        }
    }
    walk(obj) {
        const keys = Object.keys(obj)
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i])
        }
    }
    // convert(key, val) {
    //     this.defineReactive(this.data, key, val)
    // }
    /**
     * Observe a list of Array items.
     */
    observeArray (items) {
        for (let i = 0, l = items.length; i < l; i++) {
            observe(items[i])
        }
    }
    defineReactive(data, key, val) {
        // let childObj = observe(val)
        // Object.defineProperty(data, key, {
        //     enumerable: true, // 可枚举
        //     configurable: false, // 不能再define
        //     get: () => {
        //         if (Dep.target) {
        //             this.dep.depend()
        //         }
        //         return val
        //     },
        //     set: (newVal) => {
        //         if (newVal === val) {
        //             return
        //         }
        //         val = newVal
        //         // 新的值是object的话，进行监听
        //         childObj = observe(newVal)
        //         // 通知订阅者
        //         this.dep.notify()
        //     }
        // })
        defineReactive(data, key, val)
    }
}
export function observe(value, asRootData = false) {
    if (!isObject(value)) {
        return
    }
    let ob = null
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        ob = value.__ob__
    } else if (
        shouldObserve &&
        (Array.isArray(value) || isPlainObject(value)) &&
        // 对象是否可扩展
        Object.isExtensible(value) &&
        !value._isGengine
    ) {
        ob = new Observer(value)
    }
    if (asRootData && ob) {
        ob.gmCount++
    }
    return ob
}
