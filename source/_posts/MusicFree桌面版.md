---
title: MusicFree 桌面版来啦
date: 2023-07-23 22:38:39
tags:
 - 前端
categories:
 - 前端
description: MusicFree桌面版
---

MusicFree 第一个桌面版来啦，功能还不完善，但是大概能用了，先发出来测试一下好了~

依然是 GPL3.0 协议开源，代码地址：https://github.com/maotoumao/MusicFreeDesktop
打不开的话就把链接的 github 换 gitee。求star ~

来不及写 Readme 了，过两天补上；蓝奏云下载地址：https://wwzb.lanzoue.com/b042daj1a，也可以点击阅读原文下载（只打包了windows的安装包，实测mac也可以打包成功，就是有些功能上的bug，比如桌面歌词无法移动位置）。先大概介绍下功能👇

## 功能简介

主要思路和安卓版一致，也是一个本地音乐播放器，但是可以通过插件的形式扩展音源；且插件协议和安卓版**完全一致**。（也就是同一个插件在安卓版和桌面版都可以用）

### 技术选型

想了半天，electron 最合适。其他方案也行得通，但为了实现插件化，开发成本可能会很大。如果有人感兴趣的话，之后倒是可以详细写写技术选型的过程。

### 主要功能

- 播放本地音乐
- 插件化播放网络音乐（兼容安卓版的所有功能）
- 桌面歌词（mac 和 linux 还有没解决的 bug）
- 收藏歌单
- 自定义主题


## 关于 logo

暂时先用安卓版的 logo 代替，这两天有位热心小伙伴帮忙做了个 logo，近期考虑换掉~

## 播放本地音乐

直接把本地音乐拖拽进软件，就可以直接播放了：

![792fb45b99a08fdd3d1448e7ad6bf92c.gif](https://i.mji.rip/2023/07/23/792fb45b99a08fdd3d1448e7ad6bf92c.gif)

也可以拖拽包含音乐的文件夹：
![4e313e79d58b527cb6129bd0585afe49.gif](https://i.mji.rip/2023/07/23/4e313e79d58b527cb6129bd0585afe49.gif)


## 安装插件

可以从本地安装插件，也可以从网络安装插件。示例插件地址和安卓版的相同。

![f1137c8f492489f00e1b5e58cec31ce6.gif](https://i.mji.rip/2023/07/23/f1137c8f492489f00e1b5e58cec31ce6.gif)


## 桌面歌词

windows版的功能是正常的（歌词超过一定宽度的时候会被截断，已知问题但是一直没时间改）：

![710e8d7add5ba7907bc11d26edb8e540.gif](https://i.mji.rip/2023/07/23/710e8d7add5ba7907bc11d26edb8e540.gif)

mac版的话不能移动位置（虽然有些比较奇怪的办法可以暂时改下位置。。。）

## 播放控制

可以通过右下角图标或者控制中心去控制播放：

![9bcae437957669cdb47fd10b5f839d23.png](https://i.mji.rip/2023/07/23/9bcae437957669cdb47fd10b5f839d23.png)

![0c809651c4da0a568d9d9b5a89accd12.png](https://i.mji.rip/2023/07/23/0c809651c4da0a568d9d9b5a89accd12.png)


## 自定义主题

这次在自定义主题上费了些功夫。桌面版支持自定义主题包，具体来说支持定义**软件中所有的界面样式**，以及**6块主要区域的背景**。

### 常规样式

先说界面样式，这个应该比较好理解，就是定义一些颜色，布局之类的，比如通过主题包定义的暗黑模式：

![d9c68e0c544f2f281d08a232de095b6a.png](https://i.mji.rip/2023/07/23/d9c68e0c544f2f281d08a232de095b6a.png)

也可以定义一些静态的背景图：

![ce43ab5f98a94c9cc0df5a074cdca42d.png](https://i.mji.rip/2023/07/23/ce43ab5f98a94c9cc0df5a074cdca42d.png)

### 高级样式

除了这些常规功能外，为了让背景更加有想象力一点，因此开放出了6个主要区域的背景自定义，具体来说是可以用任意的html文件来定义背景，这样就可以在背景上实现一些比较酷炫的动效，或者做一些实用的功能，比如跟随当天的天气切换背景等（不过要注意性能）。

6个主要区域包括：

1. 整个窗口（app）
![ce43ab5f98a94c9cc0df5a074cdca42d.png](https://i.mji.rip/2023/07/23/ce43ab5f98a94c9cc0df5a074cdca42d.png)

2. 顶部（header）
![fd6d7934976e1b134a8b8ef77813b2f3.png](https://i.mji.rip/2023/07/23/fd6d7934976e1b134a8b8ef77813b2f3.png)

3. 侧边栏+主页面（body）
![9d82627eeb0edbade46bc7e3490c9e62.png](https://i.mji.rip/2023/07/23/9d82627eeb0edbade46bc7e3490c9e62.png)

4. 侧边栏（side-bar）
![f32e3ce9de3294fb560e1a60b1cdfd05.png](https://i.mji.rip/2023/07/23/f32e3ce9de3294fb560e1a60b1cdfd05.png)

5. 主页面（page）
![3ff6ca8b972d05c1877987d402594942.png](https://i.mji.rip/2023/07/23/3ff6ca8b972d05c1877987d402594942.png)

6. 音乐播放栏（music-bar）
![9f7a3b6edc73498248bc8bb0e13c6fb2.png](https://i.mji.rip/2023/07/23/9f7a3b6edc73498248bc8bb0e13c6fb2.png)


接下来看几个效果（代码是从 codepen 上随便拷的）：
先是几个动效：

![e79f43f799e88b8a82e7e62d500af7e0.gif](https://i.mji.rip/2023/07/23/e79f43f799e88b8a82e7e62d500af7e0.gif)

![f234216320596d46f81e2f287135b0ba.gif](https://i.mji.rip/2023/07/23/f234216320596d46f81e2f287135b0ba.gif)

下面这个背景是当前时间：

![01100ab7c54fe1394d18c4c27044e29d.gif](https://i.mji.rip/2023/07/23/01100ab7c54fe1394d18c4c27044e29d.gif)

---

先写这么多吧~~ bug 应该有一些，也只能慢慢修了... 至少现在凑合能用了

最后再求一个star~  https://github.com/maotoumao/MusicFreeDesktop

btw 最近上班的感受是：为什么这些人都不下班…… 
