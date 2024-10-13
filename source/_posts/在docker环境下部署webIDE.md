---
title: 在docker环境下部署webIDE
date: 2021-07-23 23:33:05
tags:
 - docker
 - ide
categories:
 - docker
description: 在docker环境中部署WebIDE
---
## 前言
买了个matepad11，顺带买了个键盘和鼠标。然后就想在平板上写代码。但是用平板肯定写不了啊，但是我有公网的服务器，所以想要不要用服务器运行一个webIDE，可以编写代码，同时服务器上也有nodejs环境，写个react什么的妥妥的吧。

在服务器上跑通了code-server之后，发现一个致命的问题：code-server可以访问服务器上任意一个文件，这就导致我的服务器上的数据一览无余。。同时，服务器的性能也不能保证。

因此，采用了docker部署在笔记本上，再通过frp进行内网穿透的方案。

## docker
docker是一个linux平台的沙箱系统，可以将linux平台的代码打包进docker，做成一个image，这些镜像在任意系统中的表现便都是一致的，同时它也会限制访问者只能在沙箱范围内访问，保证了安全性。

## 步骤
1. 安装docker windows(官网)
2. 在docker hub上，使用docker pull安装code-server镜像
3. 设置端口映射，启动docker，默认用户是coder，超级用户无密码。

---
## 后记
草，费了半天劲，还不如直接在电脑上装一个华为电脑管家，直接连电脑，还能把平板当扩展屏，比webIDE可香多了，浪费我时间，气得我截图都不想放了。