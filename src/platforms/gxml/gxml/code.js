export default class Code {
  constructor(gm, docInfo) {
    this.docInfo = docInfo
    let pattern =/<script>([\s|\S]*)<\/script>/
    if (pattern.test(docInfo)) {
      this.code = docInfo.match(pattern)[1]
    }
    // this.code = node.childNodes[0].data
  }
}
