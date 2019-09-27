/* @flow */
import Gengine from './runtime/index.js'
import { query } from './util/index.js'
import { compileToFunctions } from './compiler/index.js'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat.js'
import { DOMParser } from './xml/dom-parser.js'
// let gm = null
// const infoToTemplate = cached(info => {
//   const el = query.call(gm, info)
//   return el
// })
const mount = Gengine.prototype.$mount
Gengine.prototype.$mount = function (
  el,
  hydrating
) {
  // GXML does not require an element
  el = undefined// this.document.childNodes[0]
  if (!this.document) {
    let domParser = new DOMParser()
    this.document = domParser.parseFromString('<div></div>')
  }
  const options = this.$options
  let compileFunc = (template) => {
    if (template) {
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: false,
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns
    }
  }
    // gm = this 
  if (!options.render) {
    query.call(this, options.el, (code) => {
      let xmlTemplate = code
      /* istanbul ignore if */
      // if (el === document.body || el === document.documentElement) {
      //   return this
      // }
      // resolve template/el and convert to render function
      let template = options.template
      if (template) {
        if (typeof template === 'string') {
          if (template.trim().charAt(0) === '<' &&
            template.trim().charAt(template.length - 1) === '>') {
            query.call(this, template, (code) => {
              template = code
              compileFunc(template)
              mount.call(this, el, hydrating)
            }) // infoToTemplate(template)
            return this
          }
        } else {
          return this
        }
      } else if (xmlTemplate) {
        template = xmlTemplate
        compileFunc(template)
        mount.call(this, el, hydrating)
      }
    })
  } else {
    mount.call(this, el, hydrating)
  }
  return this
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
// function getOuterHTML (el) {
//   if (el.outerHTML) {
//     return el.outerHTML
//   } else {
//     const container = document.createElement('div')
//     container.appendChild(el.cloneNode(true))
//     return container.innerHTML
//   }
// }

Gengine.compile = compileToFunctions

export default Gengine
