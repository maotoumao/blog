---
title: 微信小程序PC端解密
pubDate: 2020-09-13T23:09:31
category: 算法&AI
excerpt: 微信小程序PC端是加密过的，因此直接打开wxapkg包是看不到任何有用的信息的，需要解密方可看到代码。
---
## 小程序包存在哪里
PC端的包存放在微信文件的默认保存位置，可通过设置->文件管理查看。  
进入文件夹的/WeChat Files/WeChat Files/Applet目录之后，可以看到，一系列wxblabla格式的文件夹。这些文件夹其实就是对应小程序的appid，点进去可以看到一个名称是随机数字的文件夹，进入之后看到的\_\_APP\_\_.wxapkg即是对应的小程序的包。  
当满怀欣喜的打开之后，发现是这样的：
![图片](http://imgs.maotoumao.xyz/blog-APP.wxapkg.png)
WTF???这能看出来个毛线? 很明显，这份文件是被加密过的，因此需要解码。

## 加密原理
在github上搜了一下，找到了一个大佬写的[go语言的解密版本](https://github.com/BlackTrace/pc_wxapkg_decrypt)，以及解密的原理。我把它改成了nodejs的版本，在这里也把学习到的一些东西记录一下。

整体的加密过程是这样的：
1. 对于原本的包，分成两部分，前1024字节为一部分，记为head，后边所有的字节记为tail。
2. 对于head部分：
    2.1 使用pbkdf2密钥派生算法对小程序的id（记为wxid）进行加密，其中算法的输入为：pass是小程序id，salt是8字节字符串"saltiest"，迭代次数为1000，生成一个32字节的派生密钥，记为dk。
    2.2 使用CBC模式的AES算法，以dk为密钥，以16字节字符串"the iv: 16 bytes"对head部分进行加密。由于密钥是32字节，也就是256位，因此使用的AES算法是AES-256-CBC。
3. 对于tail部分：
    3.1 小程序id的倒数第二位取出，记为xorKey，如果小程序id位数小于2，则xorKey为0x66。
    3.2 对于tail部分，使用xorKey进行异或。
4. 写入解密后的文件，顺序依次是：6个字节的字符串："V1MMWX"，加密后的head部分，加密后的tail部分。

## 解密
由于head部分的加密采用的AES是对称加密算法，类似于钥匙开门，我们可以通过2.1步骤获得这个开门的钥匙，来打开这个门。如果是非对称加密算法，例如RSA，它们是由公开的公钥加密，私钥解密，就类似于，你的大门门口挂着一把用来锁门的钥匙，但是用来开门的钥匙被你随身藏在了鞋垫底下，并且只有你知道。

对于tail部分，异或具有自反性，即：
```
    A xor B xor B === A
```
因此，我们只需要计算xorKey，再将密文进行异或，即可得到明文。

---
代码发布在[GitHub](https://github.com/maotoumao/wxpc-miniprogram-decryption)和[Gitee](https://gitee.com/maotoumao/wxpc-miniprogram-decryption)。


