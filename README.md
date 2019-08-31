---
pageClass: getting-started
---

# 介绍

[![vue](https://img.shields.io/badge/vue-2.6.10-brightgreen.svg)](https://github.com/vuejs/vue)
[![GitHub stars](https://img.shields.io/github/stars/PanJiaChen/vue-element-admin.svg?style=social&label=Stars)](https://github.com/PanJiaChen/vue-element-admin)

<!-- <CodingAD /> -->

[Gengine](http://panjiachen.github.io/vue-element-admin) 是一个基于 Vue.js 核心开发的前端框架，与Vue采用Typescript不同，Geg采用的是Es6开发,并修改了 Vue.js 的底层实现，包括了compile与platforms，并新增gxml部分。框架通过xml组织视图层级，所以它与底层视图渲染的方式,如dom的渲染等并没有直接关系，也因为这个特点，虽然Gengine开发之初是为了使用Vue兼容微信小游戏而设计，但是理论上可以使用Geg.js开发任意特定平台的视图项目。

**我们可以通过以下关系来描述Geg.js与MVVM的关系。**
```          
                               VIEW MODEL
┌----------┐                ┌---------------┐                          ┌----------┐
|          | ---------------| XMLNodeListen ├------------------------> |          |
|          |                |               |                          |          |
|  View    |                |               |                          |   Model  |
|          |                |               |                          |          |
|          | <------------- | Data Bindings ├<------------------------ |          |
└----------┘                └---------------┘                          └----------┘
    |             
    |                          
    |     ┌--------------------------┐
    └---->|  Geg.js Implementation   |
          └--------------------------┘
```
上面的关系图表明View视图的渲染逻辑需要用Geg.js针对特定平台实现
<br/>

## 安装

```
# 克隆项目
git clone https://github.com/PanJiaChen/vue-element-admin.git

# 进入项目目录
cd vue-element-admin

# 安装依赖
npm install

# 建议不要用 cnpm 安装 会有各种诡异的bug 可以通过如下操作解决 npm 下载速度慢的问题
npm install --registry=https://registry.npm.taobao.org

# 本地开发 启动项目
npm run dev
```

<br/>

## 目录结构

本项目已经为你生成了一个完整的开发框架，提供了Geg.js开发过程中的源码结构，下面是整个项目的目录层级。

```bash
├── build                      # 构建相关
├── mock                       # 项目mock 模拟数据
├── plop-templates             # 基本模板
├── public                     # 静态资源
│   │── favicon.ico            # favicon图标
│   └── index.html             # html模板
├── src                        # 源代码
│   ├── api                    # 所有请求
│   ├── assets                 # 主题 字体等静态资源
│   ├── components             # 全局公用组件
│   ├── directive              # 全局指令
│   ├── filters                # 全局 filter
│   ├── icons                  # 项目所有 svg icons
│   ├── lang                   # 国际化 language
│   ├── layout                 # 全局 layout
│   ├── router                 # 路由
│   ├── store                  # 全局 store管理
│   ├── styles                 # 全局样式
│   ├── utils                  # 全局公用方法
│   ├── vendor                 # 公用vendor
│   ├── views                  # views 所有页面
│   ├── App.vue                # 入口页面
│   ├── main.js                # 入口文件 加载组件 初始化等
│   └── permission.js          # 权限管理
├── tests                      # 测试
├── .env.xxx                   # 环境变量配置
├── .eslintrc.js               # eslint 配置项
├── .babelrc                   # babel-loader 配置
├── .travis.yml                # 自动化CI配置
├── vue.config.js              # vue-cli 配置
├── postcss.config.js          # postcss 配置
└── package.json               # package.json
```
<br/>

## 初始化
Geg.js是以微信小游戏平台为开发初衷，那么我们以微信小游戏平台Geg-Babylonjs为例,可分为三种初始化方式

**1. 加载xml文件。**

由于Gengine不对dom进行直接操作,所以这里的el传递的是xml路径

```js
import GegBabylon from './gegbabylon/index.js'
import Geg from './libs/geg.js'
Geg.use(GegBabylon)
let geg = new Geg({
  el: 'src/template.xml'
})
```

xml格式如下,外层必须通过template进行定义，说明其内部元素为解析模版


```xml
<template>
  <engine>
    <scene>
      <camera type="ArcRotateCamera"></camera>
      <light></light>
      <skybox></skybox>
      <mesh type="Sphere" :position="sPosition">
        <physics :mass="10"></physics>
      </mesh>
    </scene>
  </engine>
</template>
```

**2. Geg对象内部定义template字符串。**

```js
import GegBabylon from './gegbabylon/index.js'
import Geg from './libs/geg.js'
Geg.use(GegBabylon)
let geg = new Geg({
  el: 'src/template.xml',
  template: "<engine><scene><camera type='ArcRotateCamera'></camera></scene></engine>"
})
```

**3. 通过render与$mount方式。**

```js
import GegBabylon from './gegbabylon/index.js'
import Geg from './libs/geg.js'
Geg.use(GegBabylon)
let geg = new Geg({
    components: { App },
    render: (h) => h('App')
}).$mount()
```

<br/>

## 其他语法
想了解更多语法指南，可参考[Vuejs](https://cn.vuejs.org/v2/guide/)

## 生态圈

**除了Vuejs对应插件外,还可以通过以下插件进行Gengine开发**

1. [Geg-Babylonjs](https://router.vuejs.org/) 通过Gengine实现对Babylonjs 3D引擎的操作。

2. [Geg-Threejs](https://vuex.vuejs.org/) 通过Gengine实现对Threejs 3D引擎的操作。
