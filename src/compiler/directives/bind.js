/* @flow */
import { convertAttrVal } from '../util/index.js'
export default function bind (el, dir) {
  el.wrapData = (code) => {
    let codeRes = function() {
      let resArr = []
      resArr.push(code)
      resArr.push(`${el.tag}`)
      resArr.push(convertAttrVal(this, dir.value))
      if (dir.modifiers && dir.modifiers.prop) {
        resArr.push(true)
      } else {
        resArr.push(false)
      }
      if (dir.modifiers && dir.modifiers.sync) {
        resArr.push(true)
      }
      return this._d(...resArr)
    }
    return codeRes.call(this)
    // return `_b(${code},'${el.tag}',${dir.value},${
    //   dir.modifiers && dir.modifiers.prop ? 'true' : 'false'
    // }${
    //   dir.modifiers && dir.modifiers.sync ? ',true' : ''
    // })`
  }
}
