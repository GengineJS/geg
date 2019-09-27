import {
  getAndRemoveAttr,
  getBindingAttr,
  baseWarn
} from '../../../../compiler/helpers.js'
import { convertAttrVal } from '../../../../compiler/util/index.js'
function transformNode (el, options) {
  const warn = options.warn || baseWarn
  const staticClass = getAndRemoveAttr(el, 'class')
  if (staticClass) {
    el.staticClass = JSON.stringify(staticClass)
  }
  const classBinding = getBindingAttr(el, 'class', false /* getStatic */)
  if (classBinding) {
    el.classBinding = classBinding
  }
}

function genData (el) {
  let data = {}
  if (el.staticClass) {
    // data += `staticClass:${el.staticClass},`
    data['staticClass'] = `${el.staticClass}`
  }
  if (el.classBinding) {
    // data += `class:${el.classBinding},`
    data['class'] = convertAttrVal(this, el.classBinding)
  }
  return data
}

export default {
  staticKeys: ['staticClass'],
  transformNode,
  genData
}
