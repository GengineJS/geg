/* @flow */

import { genHandlers } from './events.js'
import baseDirectives from '../directives/index.js'
import { camelize, no, extend } from '../../core/utils/tools.js'
import { baseWarn, pluckModuleFunction } from '../helpers.js'
import { emptySlotScopeToken } from '../parser/index.js'
import { execStrFunc, convertAttrVal } from '../util/index.js'
export class CodegenState {
  constructor (options) {
    this.options = options
    this.warn = options.warn || baseWarn
    this.transforms = pluckModuleFunction(options.modules, 'transformCode')
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData')
    this.directives = extend(extend({}, baseDirectives), options.directives)
    const isReservedTag = options.isReservedTag || no
    this.maybeComponent = (el) => !!el.component || !isReservedTag(el.tag)
    this.onceId = 0
    this.staticRenderFns = []
    this.pre = false
  }
}

export function generate (
  ast,
  options
) {
  const state = new CodegenState(options)
  const code = ast ? genElement(ast, state) : function() { return this._c("div") }// '_c("div")'
  return {
    render: typeof code === 'function' ? code : `with(this){return ${code}}`,// `with(this){return ${code}}`,
    staticRenderFns: state.staticRenderFns
  }
}

export function genElement (el, state) {
  if (el.parent) {
    el.pre = el.pre || el.parent.pre
  }

  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state)
  } else if (el.once && !el.onceProcessed) {
    return genOnce(el, state)
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state)
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    return genChildren(el, state) || void 0
  } else if (el.tag === 'slot') {
    return genSlot(el, state)
  } else {
    // component or element
    let code
    if (el.component) {
      code = genComponent(el.component, el, state)
    } else {
      let data = null
      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        data = genData(el, state)
      }
      const children = el.inlineTemplate ? null : genChildren(el, state, true)
      code = function() {
        let resArr = [`${el.tag}`]
        let attrObj = data
        data && resArr.push(attrObj.call(this))
        if (!children) {
          return this._c(...resArr)
        }
        if (children instanceof Array) {
          let nodesArr = []
          resArr.push(nodesArr)
          children.forEach((item) => {
            if (item instanceof Array) {
              item[0].forEach((ele) => {
                nodesArr.push(ele.call(this))
              })
            } else {
              resArr.push(item)
            }
          })
        } else {
          for (let key in children) {
            if (typeof children[key] === 'function') {
              resArr.push(children[key].call(this))
            } else {
              resArr.push(children[key])
            }
          }
        }
        return this._c(...resArr)
      }
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}

// hoist static sub-trees out
function genStatic (el, state) {
  el.staticProcessed = true
  // Some elements (templates) need to behave differently inside of a v-pre
  // node.  All pre nodes are static roots, so we can use this as a location to
  // wrap a state change and reset it upon exiting the pre node.
  const originalPreState = state.pre
  if (el.pre) {
    state.pre = el.pre
  }
  let genFuncCode = genElement(el, state)
  let staticRenderFunc = function() {
    return genFuncCode.call(this)
  }
  state.staticRenderFns.push(staticRenderFunc) // `with(this){return ${genElement(el, state)}}`
  state.pre = originalPreState
  return function() {
    return this._m(state.staticRenderFns.length - 1, el.staticInFor ? true : false)
  }
}

// v-once
function genOnce (el, state) {
  el.onceProcessed = true
  if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.staticInFor) {
    let key = ''
    let parent = el.parent
    while (parent) {
      if (parent.for) {
        key = parent.key
        break
      }
      parent = parent.parent
    }
    if (!key) {
      return genElement(el, state)
    }
    return function() {
      return this._o(genElement(el, state).call(this), state.onceId++, key)
    }
  } else {
    return genStatic(el, state)
  }
}

export function genIf (
  el,
  state,
  altGen,
  altEmpty
) {
  el.ifProcessed = true // avoid recursion
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
}

function genIfConditions (
  conditions,
  state,
  altGen,
  altEmpty
) {
  if (!conditions.length) {
    let _e = function() {
      return this._e()
    }
    return altEmpty || _e// '_e()'
  }
  const condition = conditions.shift()
  let genTerExpFunc = genTernaryExp(condition.block)
  if (condition.exp) {
    let genIfConFunc = genIfConditions(conditions, state, altGen, altEmpty)
    return function() {
      let isExp = condition.exp
      return convertAttrVal(this, isExp) ? genTerExpFunc.call(this) : genIfConFunc.call(this)
    }
  } else {
    return function() {
      return genTerExpFunc.call(this)
    }
  }
  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp (el) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state)
  }
}

export function genFor (
  el,
  state,
  altGen,
  altHelper
) {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 // ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 // ? `,${el.iterator2}` : ''

  el.forProcessed = true // avoid recursion
  return function() {
    // _l((forVals),function(curVal){return _c('li',[_v(_s(curVal.text))])})
    let execFunc = altHelper || this._l
    let that = this
    return execFunc.call(this, exp, function() {
      let tempAlias = null, tempIte1 = null, tempIte2 = null
      if (window[alias]) {
        tempAlias = window[alias]
      }
      if (iterator1 && window[iterator1]) {
        tempIte1 = window[iterator1]
      }
      if (iterator2 && window[iterator2]) {
        tempIte2 = window[iterator2]
      }
      arguments[0] && (window[alias] = arguments[0])
      arguments[1] && iterator1 && (window[iterator1] = arguments[1])
      arguments[2] && iterator2 && (window[iterator2] = arguments[2])
      let returnCode = (altGen || genElement)(el, state)
      let result = returnCode.call(that)
      // clear global varible
      tempAlias && (window[alias] = tempAlias)
      tempIte1 && (window[iterator1] = tempIte1)
      tempIte2 && (window[tempIte2] = tempIte2)
      return result
    })
  }
}

export function genData (el, state) {
  return function() {
    //let data = "{"
    let data = {}

    // directives first.
    // directives may mutate the el's other properties before they are generated.
    const dirs = genDirectives.call(this, el, state)
    // if (dirs) data += dirs + ','
    if (dirs) { 
      data['directives'] = dirs
    }
    // key
    if (el.key) {
      // data += `"key":${el.key},`
      data['key'] = convertAttrVal(this, el.key)
    }
    // ref
    if (el.ref) {
      // data += `"ref":${el.ref},`
      data['ref'] = convertAttrVal(this, el.ref)
    }
    if (el.refInFor) {
      // data += `"refInFor":true,`
      data['refInFor'] = true
    }
    // pre
    if (el.pre) {
      // data += `"pre":true,`
      data['pre'] = true
    }
    // record original tag name for components using "is" attribute
    if (el.component) {
      // data += `"tag":"${el.tag}",`
      data['tag'] = `${el.tag}`
    }
    // module data generation functions
    for (let i = 0; i < state.dataGenFns.length; i++) {
      let genFns = state.dataGenFns[i].call(this, el)
      for (let key in genFns) {
        data[key] = genFns[key]
      }
    }
    // attributes
    if (el.attrs) {
      // data += `"attrs":${genProps(el.attrs)},`
      data['attrs'] = genProps.call(this, el.attrs)
    }
    // DOM props
    if (el.props) {
      // data += `"domProps":${genProps(el.props)},`
      data['domProps'] = genProps.call(this, el.props)
    }
    // event handlers
    if (el.events) {
      let {on} = genHandlers.call(this, el.events, false)
      on && (data['on'] = on)
    }
    if (el.nativeEvents) {
      let {nativeOn} = genHandlers.call(this, el.nativeEvents, true)
      nativeOn && (data['nativeOn'] = nativeOn)
    }
    // slot target
    // only for non-scoped slots
    if (el.slotTarget && !el.slotScope) {
      // data += `"slot":${el.slotTarget},`
      data['slot'] = convertAttrVal(this, el.slotTarget)
    }
    // scoped slots
    if (el.scopedSlots) {
      data['scopedSlots'] = genScopedSlots.call(this, el, el.scopedSlots, state)
    }
    // component v-model
    if (el.model) {
      data['model'] = {
        value: `${el.model.value}`,
        callback: el.model.callback,
        expression: el.model.expression
      }
    }
    // inline-template
    if (el.inlineTemplate) {
      const inlineTemplate = genInlineTemplate.call(this, el, state)
      if (inlineTemplate) {
        data['inlineTemplate'] = inlineTemplate
      }
    }
    // data = data.replace(/,$/, '') + '}'
    // v-bind dynamic argument wrap
    // v-bind with dynamic arguments must be applied using the same v-bind object
    // merge helper so that class/style/mustUseProp attrs are handled correctly.
    if (el.dynamicAttrs) {
      let dataPre = data
      let code = function() {
        let curProps = genProps.call(this, el.dynamicAttrs)
        curProps = typeof curProps === 'function' ?  curProps.call(this) : curProps
        return this._b(dataPre, `${el.tag}`, curProps)
      }
      data = code
    }
    // v-bind data wrap
    if (el.wrapData) {
      data = el.wrapData.call(this, data)
    }
    // v-on data wrap
    if (el.wrapListeners) {
      data = el.wrapListeners.call(this, data)
    }
    return data
  }
}

function genDirectives (el, state) {
  const dirs = el.directives
  if (!dirs) return
  // let res = `"directives":[`
  let dirArrs = []
  // let res = {directives: dirArrs}
  let hasRuntime = false
  let i, l, dir, needRuntime
  for (i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i]
    needRuntime = true
    const gen = state.directives[dir.name]
    if (gen) {
      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      needRuntime = !!gen(el, dir, state.warn)
    }
    if (needRuntime) {
      hasRuntime = true
      let curDirEle = {
        name: `${dir.name}`,
        rawName:`${dir.rawName}`
      }
      if (dir.value) {
        curDirEle['value'] = convertAttrVal(this, dir.value)
        curDirEle['expression'] = JSON.stringify(dir.value)
      }
      if (dir.arg) {
        curDirEle['arg'] = dir.isDynamicArg ? convertAttrVal(this, dir.arg) : `${dir.arg}`
      }
      if (dir.modifiers) {
        curDirEle['modifiers'] = dir.modifiers
      }
      dirArrs.push(curDirEle)
    }
  }
  if (hasRuntime) {
    return dirArrs
  }
}

function genInlineTemplate (el, state) {
  const ast = el.children[0]
  if (ast && ast.type === 1) {
    const inlineRenderFns = generate(ast, state.options)
    return {render: inlineRenderFns.render, staticRenderFns: inlineRenderFns.staticRenderFns}
  }
}

function genScopedSlots (
  el,
  slots,
  state
) {
  // by default scoped slots are considered "stable", this allows child
  // components with only scoped slots to skip forced updates from parent.
  // but in some cases we have to bail-out of this optimization
  // for example if the slot contains dynamic names, has v-if or v-for on them...
  let needsForceUpdate = el.for || Object.keys(slots).some(key => {
    const slot = slots[key]
    return (
      slot.slotTargetDynamic ||
      slot.if ||
      slot.for ||
      containsSlotChild(slot) // is passing down slot from parent which may be dynamic
    )
  })

  // #9534: if a component with scoped slots is inside a conditional branch,
  // it's possible for the same component to be reused but with different
  // compiled slot content. To avoid that, we generate a unique key based on
  // the generated code of all the slot contents.
  let needsKey = !!el.if

  // OR when it is inside another scoped slot or v-for (the reactivity may be
  // disconnected due to the intermediate scope variable)
  // #9438, #9506
  // TODO: this can be further optimized by properly analyzing in-scope bindings
  // and skip force updating ones that do not actually use scope variables.
  if (!needsForceUpdate) {
    let parent = el.parent
    while (parent) {
      if (
        (parent.slotScope && parent.slotScope !== emptySlotScopeToken) ||
        parent.for
      ) {
        needsForceUpdate = true
        break
      }
      if (parent.if) {
        needsKey = true
      }
      parent = parent.parent
    }
  }

  const generatedSlots = Object.keys(slots)
    .map(key => genScopedSlot(slots[key], state))
  let code = function() {
    let resArr = []
    resArr.push(generatedSlots)
    if (needsForceUpdate) {
      resArr.push(null)
      resArr.push(true)
    }
    if (!needsForceUpdate && needsKey) {
      resArr.push(null)
      resArr.push(false)
      resArr.push(hash(generatedSlots))
    }
    return this._u(...resArr)
  }
  return code.call(this)
}

function hash(str) {
  let hash = 5381
  let i = str.length
  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i)
  }
  return hash >>> 0
}

function containsSlotChild (el) {
  if (el.type === 1) {
    if (el.tag === 'slot') {
      return true
    }
    return el.children.some(containsSlotChild)
  }
  return false
}

function genScopedSlot (
  el,
  state
) {
  const isLegacySyntax = el.attrsMap['slot-scope']
  if (el.if && !el.ifProcessed && !isLegacySyntax) {
    return genIf(el, state, genScopedSlot, `null`)
  }
  if (el.for && !el.forProcessed) {
    return genFor(el, state, genScopedSlot)
  }
  const slotScope = el.slotScope === emptySlotScopeToken
    ? ``
    : String(el.slotScope)
  const fn = `function(${slotScope}){` +
    `return ${el.tag === 'template'
      ? el.if && isLegacySyntax
        ? `(${el.if})?${genChildren(el, state) || 'undefined'}:undefined`
        : genChildren(el, state) || 'undefined'
      : genElement(el, state)
    }}`
  // reverse proxy v-slot without scope on this.$slots
  const reverseProxy = slotScope ? `` : `,proxy:true`
  return `{key:${el.slotTarget || `"default"`},fn:${fn}${reverseProxy}}`
}

export function genChildren (
  el,
  state,
  checkSkip,
  altGenElement,
  altGenNode
) {
  const children = el.children
  if (children.length) {
    const el = children[0]
    // optimize single v-for
    if (children.length === 1 &&
      el.for &&
      el.tag !== 'template' &&
      el.tag !== 'slot'
    ) {
      let normalizationType = checkSkip ? state.maybeComponent(el) ? 1 : 0 : null
      let gen = (altGenElement || genElement)(el, state)
      let res = {}
      res['code'] = gen
      if (normalizationType !== null) {
        res['normalizeType'] = normalizationType
      }
      return res
    }
    const normalizationType = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0
    const gen = altGenNode || genNode
    let res = []
    let currFunc = children.map(c => {
      return gen(c, state)
    })
    res.push([currFunc])
    normalizationType && res.push(normalizationType)
    return res
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
function getNormalizationType (
  children,
  maybeComponent
) {
  let res = 0
  for (let i = 0; i < children.length; i++) {
    const el = children[i]
    if (el.type !== 1) {
      continue
    }
    if (needsNormalization(el) ||
        (el.ifConditions && el.ifConditions.some(c => needsNormalization(c.block)))) {
      res = 2
      break
    }
    if (maybeComponent(el) ||
        (el.ifConditions && el.ifConditions.some(c => maybeComponent(c.block)))) {
      res = 1
    }
  }
  return res
}

function needsNormalization (el) {
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
}

function genNode (node, state) {
  if (node.type === 1) {
    return genElement(node, state)
  } else if (node.type === 3 && node.isComment) {
    return genComment(node)
  } else {
    return genText(node)
  }
}

export function genText (text) {
  return function() {
    return this._v(text.type === 2 ? execStrFunc(this, text.expression) : transformSpecialNewlines(JSON.stringify(text.text)))
  }
}

export function genComment (comment) {
  return execStrFunc(this, `_e()`, [JSON.stringify(comment.text)]) // ("_e(" + (JSON.stringify(comment.text)) + ")")
}

function genSlot (el, state) {
  const slotName = el.slotName || '"default"'
  const children = genChildren(el, state)
  let res = `_t(${slotName}${children ? `,${children}` : ''}`
  const attrs = el.attrs || el.dynamicAttrs
    ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(attr => ({
        // slot props are camelized
        name: camelize(attr.name),
        value: attr.value,
        dynamic: attr.dynamic
      })))
    : null
  const bind = el.attrsMap['v-bind']
  if ((attrs || bind) && !children) {
    res += `,null`
  }
  if (attrs) {
    res += `,${attrs}`
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }
  return res + ')'
}

// componentName is el.component, take it as argument to shun flow's pessimistic refinement
function genComponent (
  componentName,
  el,
  state
) {
  const children = el.inlineTemplate ? null : genChildren(el, state, true)
  let data = genData(el, state)
  let code = function() {
    let resArr = [`${componentName}`]
    resArr.push(data.call(this))
    if (!children) {
      return this._c(...resArr)
    }
    if (children instanceof Array) {
      let nodesArr = []
      resArr.push(nodesArr)
      children.forEach((item) => {
        if (item instanceof Array) {
          item[0].forEach((ele) => {
            nodesArr.push(ele.call(this))
          })
        } else {
          resArr.push(item)
        }
      })
    } else {
      for (let key in children) {
        if (typeof children[key] === 'function') {
          resArr.push(children[key].call(this))
        } else {
          resArr.push(children[key])
        }
      }
    }
    return this._c(...resArr)
  }
  return code
}

function genProps (props) {
  let staticProps = {}
  let dynamicProps = null
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    const value = false //__WEEX__
      ? generateValue(prop.value)
      : transformSpecialNewlines(prop.value)
    if (prop.dynamic) {
      dynamicProps || (dynamicProps = [])
      dynamicProps.push(`${prop.name}`, convertAttrVal(this, value))
    } else {
      staticProps[prop.name] = convertAttrVal(this, value)
    }
  }
  // delete singleQuotes
  // staticProps = `{${staticProps.slice(0, -1)}}`
  if (dynamicProps) {
    let code = function() {
      return this._d(JSON.parse(staticProps), dynamicProps)
    }
    return code
  } else {
    return staticProps
  }
}

/* istanbul ignore next */
function generateValue (value) {
  if (typeof value === 'string') {
    return transformSpecialNewlines(value)
  }
  return JSON.stringify(value)
}

// #3895, #4268
function transformSpecialNewlines (text) {
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
