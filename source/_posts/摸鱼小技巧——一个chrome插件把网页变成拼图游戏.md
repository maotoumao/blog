---
title: 摸鱼小技巧——一个chrome插件把网页变成拼图游戏
date: 2021-12-04 21:40:27
categories:
 - 前端
tags:
 - js
 - chrome插件
description: 开发一个有趣的Chrome插件，给紧张的工作增加一些乐趣。。。
---
# 前言
前一阵子一直在忙双十一，空余时间去学了一些图形学的课（学了个半吊子），最近又开始了瞎折腾，也就又开始了随笔记录。

先说一下做了个什么东西吧：开发了一个chrome插件，在chrome打开任意一个**网页**的时候，你可以点击插件的图标，并把网页变成一个拼图游戏，原来的网页会被隐藏；当你正确的复原拼图时，页面复原。

# 效果
本来想录个视频随便加个字幕，然后忘了Pr怎么用，突然想起来b站有个云剪辑，就随便剪了一下发了上去，反正常年0播放，把b站当成个存视频的地方也不错。（吐槽一下这个云剪辑好像有bug，比如每次撤销的时候项目中的文字都会跑到默认位置去）

<iframe src="//player.bilibili.com/player.html?aid=719530466&bvid=BV18Q4y1i7Ex&cid=454758362&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>

# 原理
主要涉及到的技术有两个，其一是Chrome插件的开发，这个就按照官方文档提供的规范开发即可。其二是为了将网页转化为游戏，直接使用canvas的API也太要命了，需要用到游戏引擎，这里使用了[Eva.js](https://eva.js.org/)。接下来先来看一下如何去开发一个Chrome插件~

## Chrome插件开发概述
每一个Chrome插件都有一个manifest.json文件，它记录着关于这个插件的一系列信息，以这次开发的插件为例：
``` json
{
  "name": "Frozen Blocks",
  "description": "Reset the blocks to unfreeze your website!",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "contextMenus",
    "scripting"
  ],
  "host_permissions": [
    "*://*/*"
  ],
  "action": {
    "default_icon": "favicon.png",
    "default_title": "来点我一下试试啊"
  },
  "background": {
      "service_worker": "background.js"
  }
}

```
其中，name标记着插件的名字，description是插件的说明；version表示插件的版本号；manifest_version表示这个json文件的版本，可选项有2和3，其中版本2的json格式（比如service_worker）和版本3有区别，除此之外，对一些比如说加载外部js文件的处理也不相同。尽管目前看上去，现有的插件都是以版本2为主，但是我还是用3来试试水。permissions里面记录着插件需要的权限，这里用到了五个，包括存储（需要存储游戏的难度状态）、标签页、当前标签页（插件在所有标签页都会生效，需要获取当前标签页的截图来生成拼图）、contextMenus（需要点击右键设置难度）、scripting（游戏逻辑需要编辑脚本）；host_permissions表示在符合匹配的url中会请求额外的权限，这里的这个pattern表示全部的url。action中包括了插件的默认图标、悬浮在插件时的提示信息等基本操作。接下来是重头戏了：background的service_worker中记录着一个脚本（也就是我这里声明的background.js），它会在后台全局执行，也就是在这里，我们处理了和插件有关的所有交互。

在background.js中，我们需要做如下事情：

1. 绑定右键菜单，用于选择难度
2. 左键单击插件时，执行脚本。

todo...


