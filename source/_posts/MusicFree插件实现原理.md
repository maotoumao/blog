---
title: MusicFree插件实现原理
date: 2023-03-27 21:59:32
tags:
 - 前端
categories:
 - 前端
description: MusicFree插件的实现原理。
---

上周整理了MusicFree插件的[开发文档](http://musicfree.upup.fun/docs/tutorial-plugin/intro/)，整理完想着还是把插件的原理写的再明白些比较好，所以还是记录下吧。

# 背景
MusicFree播放器是一个基于**React Native**的**插件化**的音乐播放器。所谓插件化，就是APP内部会调用插件内定义的函数，去完成播放音乐、搜索音乐等行为，简单的架构如下图所示。早期的设计思路[可以点击这里](https://juejin.cn/post/7150589489881022478)；前阵子改了一版，虽然插件协议有所改动，但原理大同小异。

![ingN93.png](https://i.328888.xyz/2023/03/27/ingN93.png)


# 插件原理
## 从零开始
既然是插件，显然它会以外部文件(.js)的形式独立于APP存在。为了实现插件，第一件要做的事情就是**读入外部文件**（也就是所谓插件）的代码，然后将具备这个特定功能的插件代码在APP运行时hook入程序中。   

为了获取到插件内的信息，我们需要插件整体是一个**函数**，通过执行这个函数得到的返回值获取插件提供的信息。 

由于React Native自带一个js引擎，因此这部分只需要采用javascript原生的Function语法实现即可：
``` javascript
/// plugin.js
function rawPlugin(){

    return {
        platform: "插件名",
        getLyric() {
            return "我是歌词";
        }
    }
}
```

``` typescript
/// pluginManager.ts

import {readFile} from 'react-native-fs';

// 从某个路径加载插件
async function loadPlugin(pluginPath: string) {
    const rawCode = await readFile(pluginPath, 'utf8'); // 得到文本格式的代码

    // 创建一个自执行函数
    const pluginInstance = Function(`
        'use strict';
        try {
            return ${rawCode};
        } catch (e) {
            return () => {};
        }
    `)()();

    return pluginInstance;
}

loadPlugin('plugin.js')
```
以上代码也比较直白：  
1. 第一步：读入外部文件；
2. 第二步：创建一个Function，函数体为一个字符串（执行完成后得到这个函数）；
3. 第三步：执行这个Function，得到函数rawCode（别忘了，插件是一个函数），也就是第一个括号；
4. 第四步：执行插件函数(其实就是rawPlugin())，得到插件提供的信息（也就是rawCode内部的返回值）。

## 勾入运行时环境
由于插件运行在客户端APP上，也就是运行时环境中；在APP调用插件的时候也可以通过**插件的入参**来为插件提供一些**运行时的上下文**，比如：
``` javascript
/// plugin.js
function rawPlugin(runtimeContext){

    // app内调用插件的时候，这里会打印出一些运行时的信息
    console.log(runtimeContext);

    return {
        platform: "插件名",
        getLyric() {
            return "我是歌词";
        }
    }
}
```
``` typescript
/// pluginManager.ts

import {readFile} from 'react-native-fs';

// 从某个路径加载插件
async function loadPlugin(pluginPath: string) {
    const rawCode = await readFile(pluginPath, 'utf8'); // 得到文本格式的代码
    const runtimeContext = {
        foo: 'bar'
    };

    // 创建一个自执行函数
    const pluginInstance = Function(`
        'use strict';
        try {
            return ${rawCode};
        } catch (e) {
            return () => {};
        }
    `)()(runtimeContext);

    return pluginInstance;
}

loadPlugin('plugin.js')  // 控制台输出：{"foo": "bar"}
```
仔细回顾一下上一小节的流程，实质上就是在运行插件函数的时候传递了runtimeContext的入参，使得插件内部可以获取到运行时的信息。

在实际的实现中，runtime主要包括一些**内置的npm包**，从而使得插件可以与APP共享某些npm包以简化开发流程，如axios、he、cheerio等。

这样，基本的插件原理实现了，实际上这也就是最早版本插件的实现方式。但是这样写起来并不怎么舒服。

# 插件与模块
## 弊端
上述写法固然实现了目的，但看起来不是最好的解决方案。原因有二：**1. 难调试 2. 难开发**。  
### 难调试
先说第一点，难调试。由于之前的插件都是形如：
``` typescript 
/// plugin.js
function pluginName(npmPackages: INpmPackages) {

    return {
        platform: "插件名",
        async someMethod(){

        },
        // ...
    } as PluginInstance
}
```
的函数，因此调试便成了很大的问题。  
如果要调试，由于插件不支持模块导入（无论是ES6还是CommonJS），为了不影响插件内容，需要复制到一个新的文件：
``` javascript
/// test.ts
import axios from "axios";
import cheerio from "cheerio";
// ...

/** 以下是复制的插件代码 */
function pluginName(npmPackages: INpmPackages) {

    return {
        platform: "插件名",
        async someMethod(){

        },
        // ...
    } as PluginInstance
}

const pluginInstance = pluginName({
    axios,
    cheerio
});
/** 以上是复制的插件代码 */

console.log(pluginInstance.platform); // 输出: 插件名

```
需要写一大堆辅助代码之后，才可以开始调试验证。这也导致之前有反馈说：不知道怎么调试，APP环境也比较难启动；  
并且就算用APP环境下加载插件调试，也需要不停地把插件从电脑上拷贝到手机上，然后再在APP内加载，然后再看错误日志，非常麻烦。

### 难开发
再看第二点：难开发。由于插件本质上是一个嵌入Function内的单文件js函数，因此模块导入/导出语法用不了，进而webpack、esbuild等工程化工具用起来也会很麻烦：  
需要把target设置成IIFE，打包出来的bundle导入APP的时候还不一定会出什么问题。

基于以上弊端，对插件做了一次改版。

## 模块
其实，如果**把插件看作一个模块**，问题似乎就迎刃而解了：

1. 插件是一段**职责单一**的js代码，不同的插件之间功能**无任何交集**。
2. 插件的入参是**运行时环境**，返回值是**插件实例**。
3. 目前已经有**标准的模块规范**(ES6模块/CommonJS)，其中通过import/require来加载npm包或其他模块；通过export或者module.exports导出当前模块。

基于以上，似乎也可以把插件看作一个CommonJS模块：  
- 通过**require或者类似“全局变量”**的方式获取运行时环境；
- 通过**module.exports**导出插件实例。

完美扣上CommonJS模块的概念。同时，由于nodejs的模块化方案就是**CommonJS**，因此采用模块方案定义的插件可以在node.js环境下直接调用，不需要任何的复制粘贴以及辅助脚本。

## CommonJS
先来看下CommonJS模块规范吧。由于这块太过基础，因此就简单带下。CommonJS认为，每个文件都是一个模块。每个模块内都可以获取一些全局变量，用来导入或者导出模块，分别是：module、require、exports。   

### module & exports
module代表着当前模块，是一个对象。其中，有一个特殊的字段“exports”，指代着当前模块的导出对象；你可以通过给这个字段赋值来控制当前模块的导出：

```javascript
/// module1.js
module.exports = {
    foo: 'bar'
}
```
同时，exports全局变量也指向着module.exports，因此也可以通过如下方式改变导出的对象：
```javascript
/// module2.js
exports.foo = 'bar';
```

### require
require是一个函数，用来导入模块，其实也就是获取其他模块的module.exports导出的字段：
```javascript
/// module3.js
const module1 = require('module1.js'); /// {foo: 'bar'}
```

接下来需要思考的是：如何让MusicFree支持形如:
```javascript
/// pluginNew.js
const axios = require('axios');

module.exports = {
    platform: "插件名",
    async getLyric(){
        // ...
    }
}
```
的插件。

## 模块化的插件
我们可以试下把上述代码贴到浏览器控制台会发生什么：
![ine1ov.png](https://i.328888.xyz/2023/03/27/ine1ov.png)  

显然，缺少上文提到的三个全局变量：require、module和exports。接下来我们要做的是给加载“插件模块”的过程做一些改造(假定rawCode是上边pluginNew.js内的文本)：

```javascript
    // ...
    const pluginInstance = Function(`
        'use strict';
        try {
            return ${rawCode}; // 这里会出问题
        } catch (e) {
            return () => {};
        }
    `)()(_require, _module, _exports);
    // ...

```

由于**rawCode现在不是函数**了，为了让插件内部可以获取到三个特定的全局变量，我们需要手动地包一层函数：
```javascript
    // ...
    const pluginInstance = Function(`
        'use strict';
        try {
            return function(require, module, exports) {
                ${rawCode}
            }
        } catch (e) {
            return () => {};
        }
    `)()(_require, _module, _exports);
    // ...

```
现在再分析一下过程：  

1. 创建一个Function
2. 执行Function，得到函数内部的返回值
3. 执行：
```javascript
(function(require, module, exports) {
    ${rawCode}
})(_require, _module, _exports)
```

思考一下，此时rawCode内获取到的require、module和exports是APP内**运行时环境下提供给插件**的，当这个函数执行完毕后，我们可以从module.exports中获取到我们需要的插件返回值；同时也可以用require加载APP内部的npm包。

最后一步要做的，便是重新定义一下require，module和exports了。

## 定义全局变量
根据上文，module和exports其实很好办：
```javascript
// 注意：此段代码是在APP内部ReactNative环境下实现
const _module = {
    exports: {

    }
};

const _exports = _module.exports;
```

require相对来说复杂点，我们整理一下我们目前的信息：
1. require是个函数
2. require入参是npm包名（在加载npm包的情况下）
3. require的返回值会直接被模块使用

因此，我们可以做一个简单的模拟require:
``` javascript
// 注意：此段代码是在APP内部ReactNative环境下实现
import axios from 'axios';
import cheerio from 'cheerio';
import CryptoJS from 'crypto-js';

// 在app内安装的npm包
const packages = {
    axios,
    cheerio
    'crypto-js': CryptoJS,
    // ... 
}

const _require = (packageName: string) => {
    let pkg = packages[packageName];
    return pkg;
}
```

## 总结
现在回过头看，新的“模块化插件”已经诞生了，最终的插件信息会挂载到module.exports上：
``` typescript
import axios from 'axios';
import cheerio from 'cheerio';
import CryptoJS from 'crypto-js';

import {readFile} from 'react-native-fs';


// 在app内安装的npm包
const packages = {
    axios,
    cheerio
    'crypto-js': CryptoJS,
    // 其他内置的包... 
}

const _require = (packageName: string) => {
    let pkg = packages[packageName];
    return pkg;
}

// 从某个路径加载插件
async function loadPlugin(pluginPath: string) {
    const rawCode = await readFile(pluginPath, 'utf8'); // 得到文本格式的代码
    
    // 初始化模块信息
    const _module = {
        exports: {

        }
    };
    const _exports = _module.exports;

    const pluginInstance = Function(`
        'use strict';
        try {
            return function(require, module, exports) {
                ${rawCode}
            }
        } catch (e) {
            return () => {};
        }
    `)()(_require, _module, _exports);

    return _module.exports; // 模块的导出
}

loadPlugin('pluginNew.js')  
```

仔细看看这段代码，是不是和经常被问到的所谓“commonjs模块原理是什么”差不多呢？

# 代码是用来解决问题的
这章标题是随便取的，其实也是我的一个小观念。在写了一堆代码之后，自然要看一下这样子一通折腾有没有解决最初的两个问题。

从开发上来说，由于使用了commonjs模块，我可以使用更多的技术去降低开发成本：使用typescript、使用webpack等工程化工具，并且只需要把最终打包时的target设置为CommonJS即可。开发时也不再仅限于“只能写一个单文件”；甚至可以引入一些没有内置的npm包，只需要最终打包时把源码打进插件就可以了。

从调试上来说，nodejs环境下运行插件与APP环境下运行插件几乎无区别，因此可以直接一边开发一边调试以验证插件是否符合预期，大大降低了成本：

![inFRLk.png](https://i.328888.xyz/2023/03/27/inFRLk.png)

以及，除了对上述require、module和exports的实现外，也可以用类似的方式屏蔽掉插件内所有的console.log，只需要用类似的方式重新定义一下console对象即可。

# 结尾
本文中的主要代码可以在[这里](https://github.com/maotoumao/MusicFree/blob/master/src/core/pluginManager.ts)看到。

MusicFree是一个基于GPL3开源的免费音乐播放器，源代码地址：https://github.com/maotoumao/MusicFree，欢迎点个star~

感兴趣的话也可以[戳这里](https://wwzb.lanzoue.com/b041xm5fg)下载。个人业余作品，只是用于满足个人需求和技术探索。仅供学习参考，不要用于商业目的~
