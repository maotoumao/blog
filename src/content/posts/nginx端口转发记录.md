---
title: nginx端口转发记录
pubDate: 2020-07-05T21:44:26
category: 服务端
excerpt: 在玩微信公众号的时候遇到的nginx端口转发的问题。
---
# 起因
事情的开始是这样的。我准备试一下用服务器接收一下用户发给公众号的消息，就是当用户给公众号发消息的时候，微信会自动的给配置的服务器发送一个post请求，其中包含着消息。结果发现，微信公众平台配置的服务器地址只能是80端口。但是80端口放的是这个博客啊… 一个端口又不能被两个进程同时监听，于是只好端口转发。

# nginx端口转发
其实只需要在nginx中配置一下就好了。  
由于我的80端口是blog的地址，也就是说我可以把微信公众号的监听服务开启在其他端口，但是把经由80端口的请求转交给其他端口。这样在外边看起来，请求的还是80端口。  

首先配置一下端口转发，如下：
```
location / {
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $http_host;
            proxy_set_header X-NginX-Proxy true;
            proxy_pass http://127.0.0.1:targetPort/;
        }
```
proxy_set_header可以重新定义传递给代理服务器的请求头。也就是直接跟在proxy_set_header后半的诸如X-Real-IP这样的东西。  
然后设置一下目标端口就好啦，这样就相当于用nginx转发了请求，就会将经由80端口的所有请求转发到目标端口。但是这样会有问题，因为请求我的博客的get请求也会被转发掉。因此，还需要再将与博客相关的请求过滤掉：
```
    location ~ .*\.(htm|html)$ {
            root   html/blog;
            index  index.html index.htm;
        }
```
意思是这样的：  
第一行的~表示区分大小写的正则匹配，后边的就是正则式啦。  
不过这样子还是有一点问题，就是对于二级路径什么的都不能匹配，而且感觉这样子需要手动过滤的东西太多了，不是一个很好的方案。。。（之后再想吧）

