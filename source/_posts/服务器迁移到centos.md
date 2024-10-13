---
title: 服务器迁移到centos
date: 2020-08-01 11:59:14
categories:
 - 服务端
description: 把服务器从windows迁移到了cent os，然后做了一点记录。
---

1. 下载的话可以用wget，还挺方便的。
2. npm出于安全考虑，不允许以root用户运行，如果是root的话，会自动切换到一个默认的什么权限都没有的nobody用户，参考：https://docs.npmjs.com/misc/config#unsafe-perm，在执行npm install的时候这样写就好了：
``` javascript
    npm install --unsafe-perm
```
3. 迁移的时候遇到了一个问题: 之前写的博客自动部署的服务，只要使用pm2开启进程守护，那么就会无法clone，搞不清楚是谁的bug。不过目测是因为pm2不能执行开启终端之类的操作吧，因为我把进程守护工具换成forever，它就没问题了。。。但是在pm2的github的issues里面也没发现有人提出过类似的问题，就很奇怪。