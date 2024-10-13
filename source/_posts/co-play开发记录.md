---
title: co-play开发记录
date: 2020-03-28 00:17:03
categories:
 - 全栈
tags: 
 - electron
 - react
 - node.js
description: co-play是一个同步看片的工具。你可以选择包含影视资源的网站，然后和好友同步的观看这个网站的资源。
---
项目是基于electron8.0开发，2020.3.28进行重构。整个过程中遇到的问题记录如下：

#### 原始版记录(electron+jquery)
- 关于electron
    在开发的过程中才突然明白main和renderer的区别。主进程相当于是浏览器，可以控制浏览器的各种行为，renderer进程相当于是每一个页面，换句话说，每一个html中引入的js文件所在环境是renderer进程，而创建这个html窗口的js所在环境是主进程。
- 引入了jquery和bootstrap的样式：
    引入样式没什么好说的，页面引入jquery的时候提示$不存在，
    参考jquery源码，electron执行环境为node，使用commonJS模块化标准，node环境没有window对象，这种情况下，jquery将导出到module.exports对象上，需要手工绑定到当前的window窗口，即可解决。
- socketio:
    在客户端进行emit，如果需要知道提交之后的结果，可以在第三个参数上写回调函数，在服务器端监听事件之后调用回调函数，使得客户端执行相应的行为。
- 犯蠢： jsx写习惯了忘了html是怎么写的了，javascript引入的格式写错了。。

- 本地存储：
    使用了electron-store，因为是多页面需要共用状态，所以我单独写了个js模块，导出一个新的store对象，并对这个对象进行操作。
    electron-store是操作本地磁盘的，所有写在上面的数据都和磁盘文件相对应，因此退出时需要进行store.clear()删除缓存。

- 犯蠢：for in 和for of， for in迭代的是key， for of迭代的是value

- 打包：
    参考了很多文章，一开始使用electron-packager这个包，结果卡住不动，换源也没用（淘宝源的路径不对）；
    然后换成electron-builder，手动下载包到缓存路径，总算生成了未打包但是能运行的文件夹，但是还是报一个Fatal error: Unable to commit changes的错误，导致错误的原因是电脑自带的杀毒软件。。。。。关闭macfee就好了。。。

- 服务器：
    nodejs+express+socketio，体验还好。就是自己代码组织的不怎么样。

- document.querySelector()这个函数，如果找不到返回的是null，我当成了undefined来判断，所以出错了。

- 渲染进程中的sendSync()这个函数，如果等不到返回值，会一直卡着，直到等到返回值，因为是同步的。


---
#### 重构记录(electron+react)
- 安装electron
- 渲染进程require electron出错，TypeError: fs.existsSync is not a function，原因是没有nodejs环境。解决：
渲染进程：
```javascript
    const { ipcRenderer } = window.require('electron');
```
主进程：
``` javascript
const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    }
  })
```
  从而为electron工程提供了node环境，但是如果直接从浏览器打开3000端口，则会报错。因为浏览器没有node环境
- 引入了ant design库，但是好像没有按需加载，之后再说吧，咕咕咕。
- 用hooks实现了一个简单的状态管理，暂时也用不到本地存储，就没装electron-store库。

- 打包，需要同时指定：
```
registry=https://registry.npm.taobao.org/
electron_custom_dir=8.2.0
electron_mirror=http://npm.taobao.org/mirrors/electron/ 
```
才可以。如果不写第三个，会自己去github找，然后就报错了。

- 打包需要打包主进程和渲染进程 main和render,因此打包时两个都要在同一个文件夹内。打包的内容可以最小化，只包含react build之后的dist和主进程main

- 服务端重写了一下逻辑，这次看着舒服多了。

- 可以自动化的点：
  根据运行环境是生产模式还是开发环境，这决定了程序的入口(奈何webpack还没学会)

[客户端源码指路](https://github.com/HongsLi/coplay-react)(readme都没写，不愧是我)
