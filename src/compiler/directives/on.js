/* @flow */
import { convertAttrVal } from '../util/index.js'
export default function on (el, dir) {
  el.wrapListeners = (code) => {
    let codeRes = function() {
      return this._g(code, convertAttrVal(this, dir.value))
    }
    return codeRes.call(this)
    // `_g(${code},${dir.value})`
  }
}
