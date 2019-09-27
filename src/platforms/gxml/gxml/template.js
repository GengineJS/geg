import { XMLSerializer } from '../xml/dom-parser.js'
export default class Template {
  constructor(gm, docInfo) {
    this.docInfo = docInfo
    this.code = ''
    let pattern =/<template>([\s|\S]*)<\/template>/
    if (pattern.test(docInfo)) {
      this.code = docInfo.match(pattern)[1]
    }
    // console.log(docInfo, docInfo.match(pattern));
    // this.node = ''
    // for (let i = 0; i < node.childNodes.length; i++) {
    //   let item = node.childNodes[i]
    //   this.code += new XMLSerializer().serializeToString(item)
    // }
  }
}
