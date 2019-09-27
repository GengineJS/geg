export default class Style {
  constructor(gm, docInfo) {
    this.docInfo = docInfo
    let pattern =/<style>([\s|\S]*)<\/style>/
    if (pattern.test(docInfo)) {
      this.code = docInfo.match(pattern)[1]
    }
  }
}
