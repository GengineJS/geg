import { observe, toggleObserving, shouldObserve } from '../observer/observer.js'
import {
  hasOwn,
  toRawType,
  hyphenate,
  capitalize
} from './tools.js'
export function validateProp (
    key,
    propOptions,
    propsData,
    gm
) {
    const prop = propOptions[key]
    const absent = !hasOwn(propsData, key)
    let value = propsData[key]
    // boolean casting
    const booleanIndex = getTypeIndex(Boolean, prop.type)
    if (booleanIndex > -1) {
        if (absent && !hasOwn(prop, 'default')) {
            value = false
        } else if (value === '' || value === hyphenate(key)) {
            // only cast empty string / same name to boolean if
            // boolean has higher priority
            const stringIndex = getTypeIndex(String, prop.type)
            if (stringIndex < 0 || booleanIndex < stringIndex) {
                value = true
            }
        }
    }
    // check default value
    if (value === undefined) {
        value = getPropDefaultValue(gm, prop, key)
        // since the default value is a fresh copy,
        // make sure to observe it.
        const prevShouldObserve = shouldObserve
        toggleObserving(true)
        observe(value)
        toggleObserving(prevShouldObserve)
    }
    return value
}
/**
 * Get the default value of a prop.
 */
function getPropDefaultValue (vm, prop, key) {
    // no default, return undefined
    if (!hasOwn(prop, 'default')) {
        return undefined
    }
    const def = prop.default
    // the raw prop value was also undefined from previous render,
    // return previous default value to avoid unnecessary watcher trigger
    if (vm && vm.$options.propsData &&
        vm.$options.propsData[key] === undefined &&
        vm._props[key] !== undefined
    ) {
        return vm._props[key]
    }
    // call factory function for non-Function types
    // a value is Function if its prototype is function even across different execution context
    return typeof def === 'function' && getType(prop.type) !== 'Function'
        ? def.call(vm)
        : def
}
/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType (fn) {
    const match = fn && fn.toString().match(/^\s*function (\w+)/)
    return match ? match[1] : ''
}
function isSameType (a, b) {
    return getType(a) === getType(b)
}
function getTypeIndex (type, expectedTypes) {
    if (!Array.isArray(expectedTypes)) {
        return isSameType(expectedTypes, type) ? 0 : -1
    }
    for (let i = 0, len = expectedTypes.length; i < len; i++) {
        if (isSameType(expectedTypes[i], type)) {
            return i
        }
    }
    return -1
}
function getInvalidTypeMessage (name, value, expectedTypes) {
    let message = `Invalid prop: type check failed for prop "${name}".` +
      ` Expected ${expectedTypes.map(capitalize).join(', ')}`
    const expectedType = expectedTypes[0]
    const receivedType = toRawType(value)
    const expectedValue = styleValue(value, expectedType)
    const receivedValue = styleValue(value, receivedType)
    // check if we need to specify expected value
    if (expectedTypes.length === 1 &&
        isExplicable(expectedType) &&
        !isBoolean(expectedType, receivedType)) {
      message += ` with value ${expectedValue}`
    }
    message += `, got ${receivedType} `
    // check if we need to specify received value
    if (isExplicable(receivedType)) {
      message += `with value ${receivedValue}.`
    }
    return message
}
  
function styleValue (value, type) {
    if (type === 'String') {
        return `"${value}"`
    } else if (type === 'Number') {
        return `${Number(value)}`
    } else {
        return `${value}`
    }
}
  
function isExplicable (value) {
    const explicitTypes = ['string', 'number', 'boolean']
    return explicitTypes.some(elem => value.toLowerCase() === elem)
}
  
function isBoolean (...args) {
    return args.some(elem => elem.toLowerCase() === 'boolean')
}
