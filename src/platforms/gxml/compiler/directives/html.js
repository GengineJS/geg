/* @flow */

import { addProp } from '../../../../compiler/helpers.js'

export default function html (el, dir) {
  if (dir.value) {
    addProp(el, 'innerHTML', `_s(${dir.value})`, dir)
  }
}
