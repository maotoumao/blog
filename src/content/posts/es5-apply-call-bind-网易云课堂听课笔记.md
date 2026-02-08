---
title: es5 apply call bind-网易云课堂听课笔记
pubDate: 2019-06-21T15:58:43
category: 前端
excerpt: 关于apply、call和bind的听课笔记。
---
### call & apply

- call和apply是为了改变某个函数运行时的上下文而存在的。或者说，为了改变函数体内部的this指向。
- call与apply作用完全相同，只是接受参数的方式不同：
call是将参数依次传入；
apply是将参数按照列表形式传入。

- apply中第一个参数写null时，在BOM模型（浏览器环境）中，它与window相同。在node环境中，它与global相同
- 构造函数一般使用大写，比如：
``` javascript
 function Person(){}
```
- call和apply就是一个对象冒充：将函数运行时的this指向指定的对象。
---
一道面试题：
``` javascript
    function log(msg){
        console.log(msg);
    }
    log(4);
    log(4,5); 
```
输出结果是：4 4
如果想都输出？
``` javascript
    function log(){
    var args = arguments
        console.log.apply(null/console/window/this, args);
    }
    log(4);
    log(4,5); 
```
四种写法相同。
相当于将args对象输出内部的值。

---

apply和call的使用情况：
1. 数组之间追加：
``` javascript
    var arr1 = [22, 23, 25];
    var arr2 = [45, 128, 600]; //如何合并？
    
    Array.prototype.push.apply(arr1, arr2)
    console.log(arr1)
```
相当于：arr1调用数组的push方法，传入参数依次为45, 128, 600, 也就是arr1.push(45, 128, 600)

2. 获取数组中的最大值和最小值
``` javascript
    var arr1 = [22, 23, 25]
    
    var maxNum = Math.max.apply(null/window/Math, arr1)
```
相当于：Math.max(22, 23, 25)；可以这样写是因为max的实现没用到this

3. 验证是否为数组
``` javascript
    Object.prototype.toString.call(obj) === '[object Array]'
```
写一些库的时候可以采用这种方式判断传入参数是否为一个数组；数组调用toString时结果是[object Array]

4. 类数组、伪数组使用数组方法
类数组：有类似数组的属性，如arguments，DOM中的children获取的对象；
也就是：具有索引属性，有length属性。

比如arguments，它没有一些诸如slice的方法。如果想将arguments转化为一个数组，那么可以使用slice：
```javascript
    Array.prototype.slice.call(arguments, 0)
```


---

### bind
bind：返回对应的函数，改变当前的this，便于稍后调用
apply, call:立即调用

bind在事件使用的比较多。由于函数，如一些onclick事件是指向调用处的，如果想改变this，就需要用bind。ES6有箭头函数，因此可以代替bind

---
bind的使用方法：
``` javascript
    this.num = 1;
    var mymodule = {
        num: 2,
        getNum: function(){
            console.log(this.num)
        }
    }
    mymodule.getNum() // 输出2，this指向mymodule
    
    
    var a = mymoudule.getNum;
    a() // 输出1，因为此时的this指向window
    
    // 如果还是要输出2，那么：
    var b = a.bind(mymodule)()
    var b = a.call(mymodule)
    var b = a.apply(mymodule)
```

this：方法没有调用者的时候，this赋值为window，有的时候指向调用者。

``` javascript
this.num = 1;
var x = {
	num: 2,
	getNum: function(){
		console.log(this.num);
	}
}

var y = {
	num: 3,
	xgetnum: x.getNum,
	getN: function(){
		this.xgetnum()
	}
}
x.getNum() //2
y.xgetnum() //3
y.getN() //3
// var z = y.getN
// z() //报错，因为window下没有xgetnum
var z = x.getNum
z() //在sublime text下执行node，会输出undefined，直接在node运行，得出1

```
原因：Node在命令行条件下，this===global，而在文件环境下，Node的this被编译为{}。

---

- bind能否连环调用？ // 很多地方都用到了
``` javascript
    var bar = function(){
        console.log(this.x);
    }
    
    var foo = {
        x : 1
    }
    
    var foo1 = {
        x : 2
    }
    
    var foo2 = {
        x : 3
    }
    
    var func = bar.bind(foo)
    func();
    // 输出1
    
    var func1 = bar.bind(foo).bind(foo1)
    // 输出1
    
    var func2 = bar.bind(foo).bind(foo1).bind(foo2)
    // 输出1
```
需要从bind的内部实现去理解。
相当于循环嵌套了函数，比如第三个：
``` javascript
function(){
    this = foo
    function bar()
    {
        console.log(this.x)
    }
}
```
第二次绑定：
``` javascript
function(){
    this = foo1
    function (){
        this = foo
        function bar(){
            console.log(this.x)
        }
    }
}
```
.... 
尽管经过再多次的绑定，结果依然是最初的结果。

---

收获：多学基础，了解底层，手撸原理。
