function calKeyword (gm, keyword, isconvToStr = false) {
    let keywordTrim = keyword.trim()
    let objSymbol = /^{([\s|\S]*)}$/
    let arrSymbol = /^\[([\s|\S]*)\]$/
    if (keywordTrim === '') {
        return keyword
    } else {
        let result = null
        if (keywordTrim === 'false') {
            result = false
        } else if (keywordTrim === 'true') {
            result = true
        } else if (objSymbol.test(keywordTrim)) {
            result = JSON.parse(objSymConvert(gm, keywordTrim.match(objSymbol)[1]))
        } else if (arrSymbol.test(keywordTrim)) {
            result = JSON.parse(keywordTrim)
        } else {
            let keywords = keywordTrim.split(/[\[\].]/g).filter((x) => x)
            keywords.forEach((ival, index) => {
                ival = ival.trim()
                let num = Number(ival)
                !isNaN(num) && (ival = num)
                if (index === 0) {
                    result = window[ival] || gm[ival]
                } else {
                    result = result[ival]
                }
            })
            result = isconvToStr ? `${result}` : result
        }
        return result
    }
}

export let convertAttrVal = (gm, val, isconvToStr = false) => {
    let singleQuotes = /'([\s|\S]*)'/
    let doubleQuotes = /"([\s|\S]*)"/
    if (doubleQuotes.test(val)) {
        return val.match(doubleQuotes)[1]
    } else if (singleQuotes.test(val)) {
        return val.match(singleQuotes)[1]
    } else {
        let num = Number(val)
        if (!isNaN(num)) {
            return num
        } else {
            // isconvToStr ? `"${gm[val]}"` : gm[val]
            return calKeyword(gm, val, isconvToStr)
        }
    }
}
// if argVals length === 0 ? search strFunc args : apply argVals value to function
export let execStrFunc = (gm, strFunc, argVals = []) => {
    // _s(someStr)
    let parentheses = /\(([\s|\S]*)\)/
    if (argVals.length === 0 && parentheses.test(strFunc)) {
        let args = strFunc.match(parentheses)[1].split(',')
        args.forEach((val) => {
            argVals.push(convertAttrVal(gm, val))
        })
    }
    return gm[`${strFunc.substring(0, strFunc.indexOf('(')).trim()}`](...argVals)
}
export let objSymConvert = (gm, symbolKv) => {
    let startSymbol = '{'
    let attrKvs = symbolKv.split(',')
    attrKvs.forEach((ele, index) => {
        let currAttrKV = ele.split(':')
        startSymbol += `"${currAttrKV[0].replace(/'|"/g, '')}"`
        startSymbol += `:${convertAttrVal(gm, currAttrKV[1], true)}`
        if (index < attrKvs.length - 1) {
            startSymbol += ','
        }
    })
    startSymbol += '}'
    return startSymbol
}
export let attrConvert = (gm, attr) => {
    // {"attrs":{"align":'center',"text":someStr}}
    let patternAttr = /{([\s|\S]*)}/
    if (patternAttr.test(attr)) {
        let attrsKV = attr.match(patternAttr)[1]
        let attrsV = attrsKV.match(patternAttr)[1]
        return `{"attrs":${objSymConvert(gm, attrsV)}}`
    }
}