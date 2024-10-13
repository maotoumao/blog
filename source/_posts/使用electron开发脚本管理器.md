---
title: 使用electron开发脚本管理器
date: 2021-02-27 23:45:05
categories:
 - electron
tags:
 - electron
 - python
description: 自己写了一系列Python脚本工具，但是管理起来比较麻烦，改参数什么的也挺复杂，所以直接写了个桌面程序来管理python脚本。
---

# 设计思路
目的其实是设计一个桌面工具，用来方便地执行脚本和设置参数，这样这些脚本就也可以给小白用了。毕竟可视化的设置比控制台或者源代码改参数要方便且直观的多，我想这也是低代码当今大行其道的原因之一吧。

由于每一个python脚本都是一个工程(在一个单独的文件夹下)，因此，仿照package.json，自定义一个script.json，用来定义脚本的名称、说明以及传入的参数。

由于主要运行在windows桌面端，为了编写一个windows应用程序，可行的思路有：
- pyQt
- C# winForm程序，调用Python脚本
- electron调用Python脚本

前边两个已经好几年没动过都忘了，目前对electron相对更熟悉一些，除此之外，nodejs可以通过child_process的spawn来开启一个子进程，传入参数执行对应的命令，并且可以实时的获取到子进程中的数据流。100%确定可行，因此选定了这个方案。

# 实现细节
在这一小节记录一下遇到的几个小坑点
## 工程搭建
方便起见，直接使用了[electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)来进行工程搭建。模板中已经内置了react和react-router-dom等一系列工具，默认语言是ts。（吐槽一句，我还是不太喜欢ts，大概是因为类型编码真的很烦吧，写代码的时候脑子里对应好了每一个变量的类型，写出来就变成了any）

## electron实现多窗口
在开发过程中，我需要一个主窗口，还需要一个设置窗口。项目的模板是一个spa，只有一个index.html。这时有两种解决思路：
- 修改react变成一个多页的应用，在electron主进程中加载不同的页面。
- 使用react router，为不同的窗口需要的页面设置不同的路由，electron主进程加载时加载相同的html，但是是不同的路由。

显然，方案二更加简单，因此采用了方案二去实现。模板中默认的router是BrowserRouter，BrowserRouter的原理是使用html的history API，让页面UI和url同步，它需要后端进行配合支持，因为所有路由都是真实的路由，只是后端通过配置把所有的请求都转到index.html，并由react router拦截并渲染出ui。然而我们在electron中加载的是file协议的本地的html，并没有后端。这种情况下，再采用BrowserRouter，只会定位到一个不存在的路由，导致什么都输出不了。
另一种Router是HashRouter，它是使用了url中的hash部分去获取进行路由控制。hash我的理解是相当于页面的锚，不会被后端服务读取，只是由前端获取到了url的hash，并进行解析。因此在这里应当使用HashRouter，并在设置窗口加载html时的路径改写为：
```javascript
    settingWindow.loadURL(`file://${__dirname}/index.html#/setting`);
```

## 渲染进程动态引入json
在主窗口（渲染进程）中，需要读取每一个python脚本的配置文件，也就是上边提到的script.json。在创建主窗口时，我已经在配置里设置了在渲染进程中集成node环境，因此这里可以直接使用commonjs的语法引入node环境的包和文件，比如fs和path等等，当然也包括json。但是问题就出在这个require。

在使用fs进行了一系列操作之后，我使用path拼接出了script.json的路径，然而此时再加载的时候，竟然报错了，说没找到这个json文件，但是这个文件又确实存在。于是我另外开启了一个node环境，发现此时可以成功引入。然后我又在渲染进程中引入了remote对象，使用remote.require进行引入，发现此时竟然可以成功引入。因此，得出一个结论：electron渲染进程集成的node中的require和主进程的require是不同的。主进程当然就是一个正常的node环境，但是，渲染进程中集成的require实际上是一个函数，它通过向主进程的ELECTRON_BROWSER_REQUIRE信道发送信号来表示导入包，可能还有一些其他的操作。这就导致在windows环境下的进程间通信的时候，反斜杠\出现了问题，所以找不到包。

## 使用child_process执行python脚本
nodejs可以通过child_process包的exec()和spawn()来创建子进程执行python脚本。这里采用spawn创建子进程，

创建完成之后，可以监听process.stdout上的data事件从而获取python的stdout，也就是print的输出。
这里需要注意： 由于python的编码问题，需要设置std的编码为utf8编码：
``` python
    sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
```
在输出的时候需要刷新缓冲区，不然会导致输出缓冲区满了才会监听到一串数据，即：
``` python
    print('xxx', flush=True)
```

## react获取到过时的state
出现问题的代码是这样的一个函数：
``` typescript
const onScriptStart = (script: any) => {
      const process = spawn(store.get('pythonPath') as string || 'python', [
        script.entry,
        ...(script.args?.map((arg: any) => arg.value))
      ]);

      process.on('exit', (code) => {
          if(code === 0){
              new remote.Notification({
                  title: '脚本管理器',
                  body: `任务${running?.name}已完成` // 当脚本执行完成时，这里是undefined
              }).show();
          }
      })
  
      setRunning({
        ...script,
        process
      })
}
```
整个函数是一个点击事件，绑定在按钮上。根据[react官网的描述](https://zh-hans.reactjs.org/docs/hooks-faq.html#why-am-i-seeing-stale-props-or-state-inside-my-function)，我们在这里拿到了过时的state。其中提到，组件内部的任何函数，包括事件处理函数和effect，都是从它被创建的那次渲染中看到的，也就是组件内部拿到的总是定义它的那次渲染中的state和props。

在这里面，当我们点击按钮时，running这个状态是一个undefined，同时创建了一个process对象，并在它的回调函数中写了读取了这个running。而我们的running全程都是undefined。正确的方法应该是使用setRunning，传入一个函数，如果不想修改状态，就把形参返回即可读取到最新的state。采用参数传递的方式不会读取到闭包中的state，从而可以获取到当前最新的state。

## 打包
### 版本控制
可以看到，整个项目中有两个package.json，外部的是管理整个项目的，内部的其实可以看作是react的package.json。安装包的版本是由里面的package.json中的信息决定的，所以记得改里面的应用名称和版本。

### package.json
在windows环境下，根目录下package.json中的打包脚本package中，由于不存在rm -rf指令，因此可以安装rimraf包，然后把rm -rf改成rimraf，即：
```
    "package": "rimraf release && rimraf src/dist && npm run build && electron-builder build --publish never",
```

### 执行package命令
刚开始执行package会下载一堆东西，下就是了。下到最后会发现，报了一个奇怪的错误，原因是路径中有中文字符。但是用户名就是中文字符呀没办法，所以参考这个链接中的方法，修改了node_modules中一个编码就好了。[解决办法](https://blog.csdn.net/kyq0417/article/details/111266776)