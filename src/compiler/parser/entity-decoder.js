/* @flow */
import { document } from '../../platforms/gxml/xml/dom.js'// '../xml/dom.js'
let decoder
export default {
  decode (html) {
    decoder = decoder || document.createElement('div')
    decoder.innerHTML = html
    return decoder.textContent
  }
}
