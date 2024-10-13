---
title: centos系统下nginx服务器配置https
date: 2020-09-05 13:45:32
categories:
 - 服务端
tags:
 - nginx
 - https
description: 申请ssl证书，并把它配置到centos系统的nginx服务器上。
---

最近遇到两个场景需要用到https，一个是微信小程序的服务需要https，另一个是浏览器的某些api，比如navigator.mediaDevices只能在https下才可用。对于第一个场景，配置过一次https，是在阿里云领的免费的SSL证书。当时的证书通用名称填的是service.maotoumao.xyz，因为当时想的是提供一些https服务。但是对于网页来说，用https://service.maotoumao.xyz/xxxx实在是有点不好看，因此索性又在freessl.cn上又领了个证书，然后配置了一下，顺便做一个记录。

## 创建与配置
创建证书其实挺简单的，打开freessl.cn，输入域名，点击创建免费的ssl证书，即可。
![freessl.cn首页](http://imgs.maotoumao.xyz/freessl_index.png)
接下来需要填写一下邮箱，CSR生成选浏览器生成就好了。
![freessl.cn邮箱](http://imgs.maotoumao.xyz/freessl_email.png)
单击点击创建就好啦。

接下来，需要在域名管理的地方设置一下解析，然后再把网站提供的密钥和证书存储到服务器某个位置。
接下来就打开nginx的配置项，在里面加上https的相关配置：
``` ini
    server {
       listen       443 ssl;
       server_name  maotoumao.xyz;
       
       ssl_certificate      "你的pem文件的路径";
       ssl_certificate_key  "你的key文件的路径";

       ssl_protocols TLSv1 TLSv1.1 TLSv1.2;

    }
```
接下来，执行：
``` shell
    nginx -s reload
```
**按理说**应该就好了。

## 遇到问题
但是这个时候就遇到问题了。无论怎么改动nginx的配置，配置都没有生效。那么问题来了，这不是玄学吗？？？？
### 排查过程
1. 检测配置文件
``` shell
    nginx -t
```
执行上述代码可以看到，会弹出一个提示框，告诉我们配置文件的地址和语法是否正确。我们发现我们改动的配置项是对的。
2. 那为什么不生效??
> 万能大法： 重启。。
原因可能是这样的：有其他的nginx进程启动，占用了这个配置文件，导致不生效。解决方案如下：
```
    sudo pkill -f nginx & wait $!
    nginx
```
重启一下，发现就好了。

---
## 参考文献
1. [nginx - nginx: [emerg] bind() to [::]:80 failed (98: Address already in use)
](https://stackoverflow.com/questions/14972792/nginx-nginx-emerg-bind-to-80-failed-98-address-already-in-use#:~:text=%5B%3A%3A%5D%3A80%20is,%5B%3A%3A%5D%3A80%20.&text=i%20fixed%20this%20by%20running,starting%20on%20the%20desired%20port.)