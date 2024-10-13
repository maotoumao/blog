---
title: 关于__proto__和prototype的思考
date: 2019-07-30 16:20:06
categories:
 - 前端
tags:
 - js
 - 语法
description: 学习__proto__和prototype的一个小记录。
---
### 需要明确的点
- 对象具有属性__proto__，它指向其构造函数的原型属性(prototype)。
- prototype只有函数才有，它指向一个对象，这个对象（也就是原型对象）包含了由这个函数所创建的实例的一些共有属性和函数。原型对象包含一个指向原函数的constructor属性。

### 它们是什么？
js中，除了六种简单数据类型外，其他所有的都是对象，包括我们熟悉的函数，数组等。假设我们有一个对象叫做a，无论a是数组还是函数，既然a是一个对象，那么它一定是由某个构造函数A来创建的。对于这个构造函数A来说，它有一些属于它自己的操作，除此之外，它还有一些公共的操作。而这些公共的操作被存放在构造函数A的prototype中。对于a来说，它的关于A本身的操作可以直接完成，但是关于那些公共属性和函数的操作，由于这些在prototype中，它如果想要使用，需要定义一个专门的变量来引用，这就是__proto__。   
举个例子： 
``` javascript
    var a = []; // 数组类型
    a.__proto__ === Array.prototype; //true
```
> a是一个数组，它是由Array()构造函数来构建。为了访问在Array函数中定义的公共变量和函数，a的__proto__属性需要指向Array的prototype区域。

那么我们就要问了，Array也是对象，那它的__proto__又指向哪里呢？  
根据上面的分析，Array是一个对象，它是由Function创建的，因此，Array的__proto__指向创建这个函数对象的构造函数(也就是Function)的prototype：
``` javascript
    Array.__proto__ === Function.prototype; //true
```
就针对这个Array来看，它的__proto__指向构造这个对象的prototype，它的prototype定义了一些公有的方法，方便由它创建的对象进行访问。

继续追根溯源。对于Function来说，它也是一个对象。比较特殊的是，一个Function是由一个Function创建的，换句话说，Function由Function构造，它的__proto__属性正是指向Function的prototype属性。
``` javascript
    Function.__proto__ === Function.prototype; //true
```