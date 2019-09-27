/* @flow */

import { addProp } from '../../../../compiler/helpers.js'

export default function text (el, dir) {
  if (dir.value) {
    addProp(el, 'textContent', `_s(${dir.value})`, dir)
  }
}
