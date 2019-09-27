/* @flow */
export * from './attrs.js'
export * from './class.js'
export * from './element.js'
import { net } from '../gxml/index.js'
function createXml (gm, el, cb) {
  net(gm, el, cb)
}
/**
 * Query an element selector if it's not an element already.
 */
export function query (el, cb) {
  if (typeof el === 'string') {
      createXml(this, el, cb)
      // return this.gxml.template.code
  } else {
    cb(null)
  }
}
