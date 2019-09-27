export const inBrowser = typeof window !== 'undefined'
export const inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform
export const weexPlatform = inWeex && WXEnvironment.platform.toLowerCase()
export const UA = inBrowser && window.navigator.userAgent.toLowerCase()
export const isIE = UA && /msie|trident/.test(UA)
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
export const isEdge = UA && UA.indexOf('edge/') > 0
export const isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android')
export const isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios')
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge
export const isPhantomJS = UA && /phantomjs/.test(UA)
export const isFF = UA && UA.match(/firefox\/(\d+)/)

export const hasProto = '__proto__' in {}
export const nativeWatch = ({}).watch
export const isServerRendering = () => false
export let supportsPassive = false
/* istanbul ignore next */
export function isNative (Ctor) {
    return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}
export const devtools = typeof window !== 'undefined' && window.__VUE_DEVTOOLS_GLOBAL_HOOK__
export const hasSymbol =
typeof Symbol !== 'undefined' && isNative(Symbol) &&
typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys)
let _Set
/* istanbul ignore if */ // $flow-disable-line
if (typeof Set !== 'undefined' && isNative(Set)) {
    // use native Set when available.
    _Set = Set
} else {
    // a non-standard Set polyfill that only works with primitive keys.
    _Set = class Set extends SimpleSet {
        constructor () {
            super(...args)
            this.set = Object.create(null)
        }
        has (key) {
            return this.set[key] === true
        }
        add (key) {
            this.set[key] = true
        }
        clear () {
            this.set = Object.create(null)
        }
    }
}
export class SimpleSet {
    has(key) {}
    add(key) {}
    clear() {}
}
export { _Set }
