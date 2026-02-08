---
title: js的块作用域小结
pubDate: 2019-08-27T16:35:07
category: 前端
excerpt: 关于js的块作用域的一个小总结。
---
作用域是一种根据标识符名称去**查找变量的一套规则**。众所周知，js中主要存在的作用域是函数作用域，也就是说，在函数内使用var定义的变量会被封存起来，不被外界获取到。然而，js中也存在其他类型的作用域，也就是块作用域。

js中块作用域主要有三种：

### with
**不建议使用with语句，因为可能会造成变量泄露，性能也会变差**  
用with从对象中创建的作用域只在with代码块中生效。   
举个例子：
``` javascript
var o = {a:1};
with(o){
    console.log(a);
}
console.log(a); //报错
```
也就是说，只有在with声明的块作用域内，才可以直接使用对象的属性名来查找变量，在外部则查找不到，因此with内部是一个块作用域。

### try/catch
try/catch的catch分句会创建一个块作用域，其中声明的变量仅仅在catch内部有效。  
注意，这里说的声明指的是catch后边的括号内的声明。也就是说：
``` javascript
console.log(b); //undefined
try{
    throw 1;
}catch(a){
    console.log(a); //1
    console.log(b); //undefined
    var b = 2;
}
console.log(a); //报错
console.log(b); //2
```
可以发现，变量a仅仅在catch内部才生效，在外部是获取不到的。而根据var的行为，我们知道，在编译阶段，var声明的变量被提升到当前上下文的顶端（也就是当前函数作用域的顶端），因此在catch内部使用var声明的变量依然可以在外部被访问到。换句话说，整个代码是在同一个函数作用域中的。  
根据catch子句的特性，我们便可以在ES5之前模拟ES6中的let：
```javascript
try{
    throw 2;
}catch(a){
    console.log('1 ', a);
}
console.log('2 ', a); // 报错
```
相当于ES6中的：
```javascript
{
    let a = 2;
    console.log('1 ', a);
}
console.log('2 ', a); // 报错
```
### let/const(ES6)
let关键字将变量绑定到所在的{}块作用域。let变量不会进行提升。在let变量所在的块作用域内，其声明之前，这个变量都被认为是不存在的。
const关键字也可以用来创建块作用域变量，但是其值是固定的。
