export function endWith(currStr, endStr) {
    var d = currStr.length - endStr.length
    return (d >= 0 && currStr.lastIndexOf(endStr) === d)
}