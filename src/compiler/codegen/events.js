/* @flow */
import { convertAttrVal } from '../util/index.js'
const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/
const fnInvokeRE = /\([^)]*?\);*$/
const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/

// KeyboardEvent.keyCode aliases
const keyCodes = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  up: 38,
  left: 37,
  right: 39,
  down: 40,
  'delete': [8, 46]
}

// KeyboardEvent.key aliases
const keyNames = {
  // #7880: IE11 and Edge use `Esc` for Escape key name.
  esc: ['Esc', 'Escape'],
  tab: 'Tab',
  enter: 'Enter',
  // #9112: IE11 uses `Spacebar` for Space key name.
  space: [' ', 'Spacebar'],
  // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
  up: ['Up', 'ArrowUp'],
  left: ['Left', 'ArrowLeft'],
  right: ['Right', 'ArrowRight'],
  down: ['Down', 'ArrowDown'],
  // #9112: IE11 uses `Del` for Delete key name.
  'delete': ['Backspace', 'Delete', 'Del']
}

// #4868: modifiers that prevent the execution of the listener
// need to explicitly return null so that we can determine whether to remove
// the listener for .once
const genGuard = condition => `if(${condition})return null;`

const modifierCode = {
  stop: '$event.stopPropagation();',
  prevent: '$event.preventDefault();',
  self: genGuard(`$event.target !== $event.currentTarget`),
  ctrl: genGuard(`!$event.ctrlKey`),
  shift: genGuard(`!$event.shiftKey`),
  alt: genGuard(`!$event.altKey`),
  meta: genGuard(`!$event.metaKey`),
  left: genGuard(`'button' in $event && $event.button !== 0`),
  middle: genGuard(`'button' in $event && $event.button !== 1`),
  right: genGuard(`'button' in $event && $event.button !== 2`)
}

export function genHandlers (
  events,
  isNative
) {
  const prefix = isNative ? 'nativeOn' : 'on'
  let res = {}
  let staticHandlers = {}
  let dynamicHandlers = []
  for (const name in events) {
    const handlerCode = genHandler.call(this, events[name])
    if (events[name] && events[name].dynamic) {
      // dynamicHandlers += `${name},${handlerCode},`
      dynamicHandlers.push(`${name}`, handlerCode)
    } else {
      // staticHandlers += `"${name}":${handlerCode},`
      staticHandlers[`${name}`] = handlerCode
    }
  }
  // staticHandlers = `{${staticHandlers.slice(0, -1)}}`
  if (dynamicHandlers) {
    // let code = function() {
    //   return this._d(staticHandlers, dynamicHandlers)
    // }
    res[prefix] = this._d(staticHandlers, dynamicHandlers)
    // return prefix + `_d(${staticHandlers},[${dynamicHandlers.slice(0, -1)}])`
  } else {
    res[prefix] = staticHandlers
    // return prefix + staticHandlers
  }
  return res
}

// Generate handler code with binding params on Weex
/* istanbul ignore next */
function genWeexHandler (params, handlerCode) {
  let innerHandlerCode = handlerCode
  const exps = params.filter(exp => simplePathRE.test(exp) && exp !== '$event')
  const bindings = exps.map(exp => ({ '@binding': exp }))
  const args = exps.map((exp, i) => {
    const key = `$_${i + 1}`
    innerHandlerCode = innerHandlerCode.replace(exp, key)
    return key
  })
  args.push('$event')
  return '{\n' +
    `handler:function(${args.join(',')}){${innerHandlerCode}},\n` +
    `params:${JSON.stringify(bindings)}\n` +
    '}'
}

function genHandler (handler) {
  if (!handler) {
    return function() {}
  }
  let that = this
  if (Array.isArray(handler)) {
    return [handler.map(handler => genHandler.call(this, handler))]
    // return `[${handler.map(handler => genHandler(handler)).join(',')}]`
  }

  const isMethodPath = simplePathRE.test(handler.value)
  const isFunctionExpression = fnExpRE.test(handler.value)
  const isFunctionInvocation = simplePathRE.test(handler.value.replace(fnInvokeRE, ''))
  if (!handler.modifiers) {
    if (isMethodPath || isFunctionExpression) {
      return convertAttrVal(that, handler.value)
    }
    /* istanbul ignore if */ // __WEEX__
    if (false && handler.params) {
      return genWeexHandler(handler.params, handler.value)
    }
    let code = function($event) {
      // isFunctionInvocation ? return handler.value : handler.value
      let tempEve = null
      if (window['$event']) {
        tempEve = window['$event']
      }
      window['$event'] = $event
      let convertAV = convertAttrVal(that, handler.value)
      if (tempEve) {
        window['$event'] = tempEve
      }
      if (isFunctionInvocation) {
        return convertAV
      }
    }
    return code
    // return `function($event){${
    //   isFunctionInvocation ? `return ${handler.value}` : handler.value
    // }}` // inline statement
  } else {
    let code = function($event) {
      // let code = ''
      // let genModifierCode = ''
      const keys = []
      // const genGuard = condition => `if(${condition})return null;`

      // const modifierCode = {
      //   stop: '$event.stopPropagation();',
      //   prevent: '$event.preventDefault();',
      //   self: genGuard(`$event.target !== $event.currentTarget`),
      //   ctrl: genGuard(`!$event.ctrlKey`),
      //   shift: genGuard(`!$event.shiftKey`),
      //   alt: genGuard(`!$event.altKey`),
      //   meta: genGuard(`!$event.metaKey`),
      //   left: genGuard(`'button' in $event && $event.button !== 0`),
      //   middle: genGuard(`'button' in $event && $event.button !== 1`),
      //   right: genGuard(`'button' in $event && $event.button !== 2`)
      // }
      for (const key in handler.modifiers) {
        switch (key) {
          case 'stop':
            $event.stopPropagation()
            break
          case 'prevent':
            $event.preventDefault()
            break
          case 'self':
            if ($event.target !== $event.currentTarget) {
              return null
            }
            break
          case 'ctrl':
            if (!$event.ctrlKey) {
              return null
            }
            break
          case 'shift':
            if (!$event.shiftKey) {
              return null
            }
            break
          case 'alt':
            if (!$event.altKey) {
              return null
            }
            break
          case 'meta':
            if (!$event.metaKey) {
              return null
            }
            break
          case 'left':
            keys.push(key)
            if ('button' in $event && $event.button !== 0) {
              return null
            }
            break
          case 'middle':
            if ('button' in $event && $event.button !== 1) {
              return null
            }
            break
          case 'right':
            keys.push(key)
            if ('button' in $event && $event.button !== 2) {
              return null
            }
            break
          case 'exact':
            const modifiers = (handler.modifiers)
            let modifierCodes = ['ctrl', 'shift', 'alt', 'meta'].filter(keyModifier => !modifiers[keyModifier])
            modifierCodes.forEach(keyModifier => {
              if ($event[`${keyModifier}Key`]) {
                return null
              }
            })
            break
          default:
            keys.push(key)
        }
        // if (modifierCode[key]) {
        //   // genModifierCode += modifierCode[key]
          
        //   // left/right
        //   if (keyCodes[key]) {
        //     keys.push(key)
        //   }
        // } else if (key === 'exact') {
        //   const modifiers = (handler.modifiers)
        //   genModifierCode += genGuard(
        //     ['ctrl', 'shift', 'alt', 'meta']
        //       .filter(keyModifier => !modifiers[keyModifier])
        //       .map(keyModifier => `$event.${keyModifier}Key`)
        //       .join('||')
        //   )
        // } else {
        //   keys.push(key)
        // }
      }
      if (keys.length) {
        // `if(!$event.type.indexOf('key')&&` +
        // `${keys.map(genFilterCode)})return null;`
        if (!$event.type.indexOf('key')) {
          let resultFilter = true
          keys.forEach(key => {
            if (!genFilterCode.call(that, key, $event)) {
              resultFilter = false
            }
          })
          if (resultFilter) {
            return null
          }
          // if (keys.map(genFilterCode)) {

          // }
        }
        // if (!$event.type.indexOf('key'))
        // genKeyFilter(keys)
        // code += genKeyFilter(keys)
      }
      // Make sure modifiers like prevent and stop get executed after key filtering
      // if (genModifierCode) {
      //   code += genModifierCode
      // }
      if (isMethodPath) {
        return handler.value($event)
      } else {
        if (isFunctionExpression) {
          return handler.value($event)
        } else {
          if (isFunctionInvocation) {
            return handler.value
          } else {
            handler.value
          }
        }
      }
      // const handlerCode = isMethodPath
      //   ? `return ${handler.value}($event)`
      //   : isFunctionExpression
      //     ? `return (${handler.value})($event)`
      //     : isFunctionInvocation
      //       ? `return ${handler.value}`
      //       : handler.value
      /* istanbul ignore if __WEEX__*/
      // if (false && handler.params) {
      //   return genWeexHandler(handler.params, code + handlerCode)
      // }
      // return `function($event){${code}${handlerCode}}`
    }
    return code
  }
}

// function genKeyFilter (keys) {
//   return (
//     // make sure the key filters only apply to KeyboardEvents
//     // #9441: can't use 'keyCode' in $event because Chrome autofill fires fake
//     // key events that do not have keyCode property...
//     `if(!$event.type.indexOf('key')&&` +
//     `${keys.map(genFilterCode).join('&&')})return null;`
//   )
// }

function genFilterCode (key, $event) {
  const keyVal = parseInt(key, 10)
  if (keyVal) {
    return $event.keyCode !== keyVal
  }
  const keyCode = keyCodes[key]
  const keyName = keyNames[key]
  let code = function () {
    return this._k($event.keyCode, key, keyCode, $event.key, keyName)
  }
  return code.call(this)
  // return (
  //   `_k($event.keyCode,` +
  //   `${JSON.stringify(key)},` +
  //   `${JSON.stringify(keyCode)},` +
  //   `$event.key,` +
  //   `${JSON.stringify(keyName)}` +
  //   `)`
  // )
}
