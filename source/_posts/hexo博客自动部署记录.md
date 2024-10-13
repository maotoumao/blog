---
title: hexo自动部署记录
date: 2020-06-22 22:12:55
category: 
 - 服务端
tags: 
 - node.js
description: 写了点代码，可以让hexo博客在本地更新后，自动部署到服务器上。
---

# 前言

之前用hexo在自己的服务器上搭建了博客。每次更新博客的时候，都需要执行如下操作：
```
    npm run clean
    npm run build
    npm run deploy
    手动把/public文件夹复制到服务器上
```
其中，前三个是写在package.json文件中的操作，分别执行删除、构建和发布的过程。明显可以看到，这四个步骤，有很大的精简空间。因此，我们希望可以通过运行一次操作，就自动的把最新的博客内容更新到服务器上。

---
# 指令合并

观察上边的四步操作，其中，前三步都是指令。既然是依次执行的指令，那么我们就可以把它合并。在博客根目录下的package.json文件中的scripts中编写脚本：
```json
    "publish": "hexo clean & hexo g -d"
```
这样，我们便把三步指令合并成了一步，我们通过:
```
    npm run publish
```
即可执行。当然，这并不是这次记录的重点。重点是，如何将第四步与前三步进行合并。

---

# 自动部署的方案
我们再次回顾前三个步骤。clean和build都不用说，这都是在本地执行的操作，一个是删除当前目录下的/public文件，一个是根据当前的博客生成/public文件。
而对于deploy，它是将我们的博客，也就是build之后的/public文件夹，发布到指定的远程仓库。执行deploy操作首先需要在根目录下的_config.yml文件中进行配置：
```
deploy:
  type: git
  repository: your/remote/repository/path
  branch: master
```
然后，当执行hexo deploy指令时，它便会自动的将/public文件夹推送到我们配置的仓库中去。既然这样，我们脑海中自然就有了如下三个方案：

## 使用github的静态博客页
这种方案的话，我们直接在上边的配置中把repository配置为github.io博客即可。接下来给我们自己的域名设置一个重定向，当访问我们自己的域名时，重定向到github.io静态博客。直接在nginx上配置即可。
    
> 不想用它，难受。

## 在服务器搭建一个git仓库
至于这种方案，我们首先需要在我们的服务器上搭建一个git仓库；开启一个进程时刻监听着这个文件夹，一旦博客仓库有更新，就把它拷贝到nginx目录下html中的对应文件夹去。

> 需要搭建git仓库；还要写个监听程序；懒得弄。

## webhook
这是我最后采用的方案。
    
Webhook是github中提供的功能，WebHook被触发后，发送HTTP/HTTPS的目标通知地址。我们只需要配置一个url，然后再服务器的相应端口开启服务。当相应的动作，如push，被触发的时候，github会自动发送一个post请求，参数中附带着这个仓库的基本信息。我们可以根据这个信息知道博客被更新了，需要拉下来新的代码。

也就是，如果采用这种方案，只需要执行npm run publish，博客即可自动更新，

---

# 设计思路
大体思路是这样的：
```
    deploy => 触发webhook => 发送post请求 => 服务器收到请求 => 把远程仓库克隆到本地的某个文件夹 => 将本地文件夹复制到目标文件夹
```
当然也不一定这么做，其实可以直接clone到目标文件夹，但是我想，从下载下来到复制到目标文件夹的过程，中间可能还可以加一些什么骚操作，所以就分开了。

---
# 代码思路
代码思路就按照上述设计思路来了，代码在[这里](https://github.com/maotoumao/webhook-server)，改一下config，配一下webhook然后部署到服务器上应该就可以了。简要记录一下用到的库和一些小坑：

## 库
```
    http： 用来开启一个服务，监听请求。
    nodegit： 操作git，完成clone服务。
    path： 完成path的相关操作。
    fs： 文件操作。
    ncp： 递归的进行复制。
    chalk： 在控制台输出带样式的文字。
```

## 小坑
- nodegit的clone，从github克隆的时候很慢，所以我直接切到了码云，比github快多了，功能也一样。
- nodegit的clone，只能克隆到空目录。
- fs的mkdir必须要有回调函数。
- ncp的第三个参数是错误回调函数，如果没有错误，参数是null，照样会输出错误（据我观察是这样，因为拷贝成功了）。


## TODO
- 支持一下私有仓库；
- 逻辑完善一下，可以使用WebHook密码增加安全性。

---
# 2020.08.01补充
服务器迁移到了cent os系统，因此对这一部分代码也重构了，直接用了fs-extra库去操作文件，但是这次git clone的时候遇到了问题，一直提示SSL未认证，找到解决方案如下：https://stackoverflow.com/questions/29479131/nodegit-cloning-not-working
