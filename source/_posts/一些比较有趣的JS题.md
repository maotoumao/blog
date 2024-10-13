---
title: 一些比较有趣的JS题
date: 2019-06-25 16:13:57
categories:
 - 前端
tags:
 - js
 - 语法
 - 题目
description: 记一些有意思的js题吧。
---

**在网上或者群里看到的一些关于js语法的题目，有的自己一时半会也没想清楚，在这里记录下来，方便以后查阅。**

---
1. 代码的输出结果？
``` javascript
    var a = 1.0 - 0.9;
    if(a === 0.1){
        console.log(true);
    }
    else{
        console.log(false);
    }
    
    var b = 0.8 - 0.7;
    if(a === b){
        console.log(true);
    }
    else{
        console.log(false)
    }
```
答案：false false
> - js的浮点数运算在计算之后都会有一定的精度损失，因此计算之后的结果，也就是a和b，不会是0.1，而是**近似于0.1**的一个浮点数。  
> - 当然，a与b也不是绝对不会相等。对于下面这段代码：
> ``` node
> var a = 2.0 - 1.9;
> if(a === 0.1){
> 	console.log(true);
> }
> else{
> 	console.log(false);
> }
> 
> var b = 3.0 - 2.9;
> if(a === b){
> 	console.log(true);
> }
> else{
> 	console.log(false)
> }
> ```
> 输出的结果即为false和true。因为损失的精度值完全相同。  
> - 精度损失的问题通常出现在**浮点数运算**与**大整数运算**中。
> - ++解决精度损失的方案++：对浮点数运算，首先对其放大一定倍数，直至变为整数，再缩小相应倍数，得到精确值。

---

2. 代码的输出结果？
``` node
    var x = 30;
    function test(){
        console.log(x);
        var x = 10;
        console.log(x);
        x = 20;
        function x(){}
        console.log(x);
    }
```
答案：function x(){} 10 20
> - 出现这个结果的原因是**变量提升**。function在定义时，提升到代码块最顶部的位置，也就是test函数内的第一行。因此，整个代码理解起来相当于：
> ```node
>     var x = 30;
>     function test(){
>         function x(){}
>         console.log(x);
>         var x = 10;
>         console.log(x);
>         x = 20;
>         console.log(x);
>     }
> ```
>因此有上述结果。
---

3. 代码的输出结果？
``` node
    var a = {n : 1}
    var b = a;
    a.x = a = {n : 2}
    console.log(a.x)
    console.log(b.x)
```
答案：undefined {n:2}
>- 这是由于运算符优先级而导致的问题。  
在最开始时，a和b共同指向了一个位置A，这个位置存放着{n:1}。
之后当执行代码：
> ```node
>     a.x = a = {n:2}
> ```
>时，.运算符比赋值运算符优先级高，因此首先计算a.x，也就是位置A中的x。接下来，按照优先级表，从右向左进行赋值。假设{n:2}存放在位置B，那么第二步就是将a指向位置B。而第三步，由于第一步先计算了位置A中的x，因此第三步是将位置A中的x取出，并指向位置B。因此，计算完成之后，位置A存储的值为：{n:1, x:{n:2}}，而位置B存储的值为：{n:2}。显然，最终的结果是b指向位置A，a指向位置B。故而有上述结果。  
>- 在写代码时，**不要写连续赋值**。