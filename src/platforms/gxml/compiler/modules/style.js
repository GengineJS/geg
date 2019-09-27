/* @flow */
import { parseStyleText } from '../../util/style.js'
import {
  getAndRemoveAttr,
  getBindingAttr
} from '../../../../compiler/helpers.js'
import { convertAttrVal } from '../../../../compiler/util/index.js'
function transformNode (el, options) {
  const staticStyle = getAndRemoveAttr(el, 'style')
  if (staticStyle) {
    el.staticStyle = JSON.stringify(parseStyleText(staticStyle))
  }

  const styleBinding = getBindingAttr(el, 'style', false /* getStatic */)
  if (styleBinding) {
    el.styleBinding = styleBinding
  }
}

function genData (el) {
  let data = {}
  if (el.staticStyle) {
    // data += `staticStyle:${el.staticStyle},`
    data['staticStyle'] = `${el.staticStyle}`
  }
  if (el.styleBinding) {
    // data += `style:(${el.styleBinding}),`
    data['style'] = convertAttrVal(this, el.styleBinding)
  }
  return data
}

export default {
  staticKeys: ['staticStyle'],
  transformNode,
  genData
}
