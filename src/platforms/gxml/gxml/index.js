import Code from './code'
import Template from './template'
import Style from './style'
import { endWith } from '../util/tools.js'
export class Gxml {
  constructor(gm, xml, callback) {
    this.cb = callback
    this.httpReq = new XMLHttpRequest()
    this.gm = gm
    this.xml = xml
    this.init()
  }
  init() {
    let options = this.gm.$options
    // this.promise.then(() => {
    //  let tempInfo = this.httpReq.responseText === '' ? '<template><div></div></template>' : this.httpReq.responseText
    //  this.convertXml(tempInfo)
    // })
    if (endWith(this.xml && this.xml.trim(), '.xml')) {
      this.connect(options.el)
    } else if(this.xml && this.xml.trim() !== ''){
      this.convertXml(`<template>${this.xml.trim()}</template>`)
    } else {
      this.convertXml(`<template><div></div></template>`)
    }
  }
  convertXml(info) {
    let res = `<Geg>${info}</Geg>`
    // let doc = new DOMParser().parseFromString(res, 'text/xml')
    this.docInfo = res
    this.code = new Code(this.gm, this.docInfo)
    this.template = new Template(this.gm, this.docInfo)
    this.style = new Style(this.gm, this.docInfo)
    this.cb && this.cb(this.template.code)
  }
  connect(url, callback) {
    this.httpReq.open('get', url)
    this.httpReq.send()
    this.httpReq.onreadystatechange = () => {
      if (this.httpReq.readyState == 4 && this.httpReq.status == 200) {
        this.convertXml(this.httpReq.responseText)
        callback && callback.call(this)
      }
    }
  }
}
export function net(gm, xml, cb) {
  gm.gxml = new Gxml(gm, xml, cb)
}
