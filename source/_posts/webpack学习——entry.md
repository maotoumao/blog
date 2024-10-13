---
title: webpack学习 —— entry
date: 2021-01-31 20:44:28
tags:
 - webpack
categories:
 - 前端
 - webpack
description: 以前对于webpack的配置一直感觉云里雾里，包括实习的时候对webpack的配置也是摸不清楚，所以学习一下webpack，并记录一下学习过程中遇到的问题。
---
## 基本思想
在开始之前，首先想一下，如果不用各种框架，我们会怎么去开发一个web前端页面。页面的骨架由html组成，html内可能以内嵌或者引入外部文件的方式来加载css和js。为了使得代码不至于太臃肿，我们会倾向于选择引入外部文件。对于想尽快完成任务的人来说，都会优先选择一些别人开发好的外部js库来提升效率，比如说在我们自己的js代码**之前**使用script标签引入jquery库，由于jquery在window对象下挂载了一个名为$的变量，并且它在页面加载时优先于我们自定义的代码被执行，因此我们可以在我们的代码中尽情使用jquery。那么问题来了：当规模比较庞大，需要引入很多很多外部的库的时候，或者我们的代码量很大，需要由不同的人写一些重复功能的代码的时候，代码整体的组织势必会混乱，单人开发可能都会难以管理，何况多人协同。同时，我们也不能保证我们引入的库是否挂载在同名变量下，也就是可能会有命名空间的冲突。

这个时候，我们想一下我们以前学过的其他语言是怎么做的：比如说我们需要使用python实现某个功能，我们可能会把部分工具代码作为一个模块，写在一个文件中，在其他需要使用到地方进行导入。这种方式有显而易见的好处：最直接的是，命名空间不会被污染（因为并没有挂载到相同的全局变量下），除此之外，模块之间耦合程度低，增加了代码的可维护性。不过，在以前(ES6之前)，这种方式在浏览器中对于js来说是行不通的。

这个时候，webpack就体现出了它的作用。webpack认为，工程中的每一个文件都可以看作一个模块，我们可以在代码中以commonjs的标准定义js模块，当我们在配置中指定某一个js文件作为根入口(entry)时，webpack可以根据我们导入的其他模块来自动的递归的生成依赖树，把所有涉及到的js文件按顺序打包到一个或多个js文件中，并插入到html文档中。webpack默认是只对js文件进行操作，但是，我们也可以通过使用loader对其他的非js的文件进行加载。

那么接下来，我们从最开始的入口——entry开始吧。

## entry的定义
> entry是配置模块的入口，可抽象成输入，Webpack 执行构建的第一步将从入口开始搜寻及递归解析出所有入口依赖的模块。(参考：https://webpack.wuhaolin.cn/2%E9%85%8D%E7%BD%AE/2-1Entry.html)

在webpack.config.js中我们可以这样去定义：
```js
module.exports = {
    entry: 'xxx' 
}
```
其中，entry的值有三种：
- 字符串：string
    这种类型指定了一个入口，于是webpack会以这个文件作为入口，输出一个打包后的bundle.js（不一定叫这个名字）
- 字符串数组：string[]
    这种类型指定了多个入口，webpack会依次以这些入口递归的分析并打包，输出一个打包后的bundle.js。
- 对象：object<string, string|string[]>
    这种类型指定了多个入口，webpack会把这些值作为入口依次进行递归的分析并打包，输出**多个**打包后的文件，每个文件默认的名字是对象中的key的名字。

看上去都是很好理解的概念，但是接下来问题就来了：

## 入口的文件存在引用怎么处理?
假如有两个文件：
```javascript
/***** src/a.js *****/
import './b.js'

console.log('load a');

/***** src/b.js *****/
console.log('load b')
```


### array类型
假如根目录下的webpack.config.js的入口指定为：
```javascript
module.exports = {
    entry: [
        './src/a.js',
        './src/b.js'
    ]
}
```
我们可以看到，首先，webpack会以a为入口，a引入了b，所以先加载b，然后加载a，因此输出load b，load a。然后以b为入口，由于这种模式下会打包到同一个文件中，而这个文件已经引入了b，所以此时不会再引入b，因此最终的输出就是：load b和load a。

### object类型：
假如根目录下的webpack.config.js的入口指定为：
```javascript
module.exports = {
    entry: [
        e1: './src/a.js',
        e2: './src/b.js'
    ]
}
```

这种情况下，我们知道，默认会被打包成2个文件，一个名为e1，一个名为e2。首先以e1为入口，分析发现，引入了b的代码，因此输出load b。然后输出load a。此时e1打包完成。但是与array不一样的是，object类型的每一个键值对都会被打包成一个js文件，在这种情况下，还是会以b为入口，再次去进行递归检索。此时又会输出load b。因此最终的输出是 load b， load a和load b。


## 循环引用怎么处理？
假如有两个文件：
```javascript
/***** src/a.js *****/
import './b.js'

console.log('load a');

/***** src/b.js *****/
import './a.js'

console.log('load b')
```

假如根目录下的webpack.config.js的入口指定为：
```javascript
module.exports = {
    entry: [
        e1: './src/a.js',
        e2: './src/b.js'
    ]
}
```
经过测试，这种情况下webpack会采用一个类似于标记是否访问过的策略。首先以a为入口，a导入了b，那么先输出load b，然后发现b导入了a，这个时候认为a已经导入过了，便输出一个load a，就结束了。object同理。

当然，这种情况下，如果使用到了另一个模块中未定义的变量，最终打包后的文件就会出现未初始化的错误。并且还存在于类似于懒加载的机制：假如引入了另一个文件，但是并没有使用其中的变量，那么它也不会报错，比如：
``` javascript
/***** src/a.js *****/
import b from './b.js'

console.log('load a', b);

export default 'a';
/***** src/b.js *****/
import a from './a.js'

console.log('load b') ; // 如果按照上边entry的写法，写console.log(a)就会报错

export default 'b';
```