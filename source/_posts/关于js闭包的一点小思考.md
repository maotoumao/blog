---
title: 关于js闭包的一点小思考
date: 2019-04-22 15:27:45
categories:
 - 前端
tags:
 - js
 - 语法
description: 试着理解了一下js的闭包，做一下记录。
---
今天试了几个例子，尝试理解了一下js闭包的用法，以及垃圾回收机制。尝试的代码放在下边，注释是我对执行结果的理解。

---

例1：

```javascript
function f1(){
    var n=1;
    let nAdd=function(){n+=1};
    let log = function(){console.log(n)};

　　function f2(){
        console.log(n);
　　}
　　return f2;
}

// 在这个位置写nAdd()是会出错的，因为没有执行f1()，nAdd尚未定义
f1(); //n=1
nAdd(); // 由于nAdd是一个全局变量，它内部引用了n，所以上边的f1()不会立即销毁 n=2
log(); //n=2
f1()(); //重新调用f1，调用时，重新执行，nAdd引用了一个新的n，此时上一个f1()对应的n被销毁
nAdd(); //add引用的n被重置为1, n=2
log() //n=2
```


---
例2：

```javascript
function f1(){
    var n=1;
    nAdd = function(){n+=1}
    log = function(){console.log(n)}

    function f2(){
        console.log(n);
    }

    return f2;
}

// 在这个位置写nAdd()是会出错的，因为没有执行f1()，nAdd尚未定义
var a = f1(); //n=1
nAdd(); // 由于a是一个全局变量，它内部引用了n，所以上边的f1()不会立即销毁 n=2
log(); //n=2
var b = f1(); //调用f1，b与a是两个变量，变量n位于它们内部，因此互不干扰。
log(); //add在定义b的时候被重新赋值，因此指向的n是b内的n，所以此时输出的应该是1
a();
b(); //互不干扰，输出原本的值
```
---
例3：

问题描述：
实现函数 makeClosures，调用之后满足如下条件：
			1、返回一个函数数组 result，长度与 arr 相同
			2、运行 result 中第 i 个函数，即result\[i]()，结果与 fn(arr[i]) 相同。

看到这个问题，我写出了如下代码：
```javascript
    result = [];
    for(var i = 0; i < arr.length; ++i){
        result.push(function(){
            // i在这个for循环内是始终存在的，因此如果直接返回fn(arr[i])会全输出NAN因为循环结束后，i=3
            return (function(n){
                return fn(arr[n])
            })(i)
        })
    }

    return result
```
显然，这个结果是错的。result内部push的函数中，仍然使用了外部发生变化的量i，因此最后的值是NAN（循环结束后i指向arr.length，因此arr[i]其实不存在。

正确做法如下：
```javascript
    result = [];
    for(var i =0; i < arr.length; ++i){
        // 把动态发生变化的量写在形参里
        result.push(function(n){
            return function(){
                return fn(arr[n])
            }
        }(i))
    }

    return result;
```
此时result返回的函数内部没有用到任何发生变化的量（i），因此也就可以返回正确的结果。

---

返回闭包时，一定要想清楚闭包内的变量指向，不要在闭包内引用任何外部的会发生变化的量。慎用闭包，小心内存泄露。

