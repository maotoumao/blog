---
title: 【完整的练手小项目】搭建自己的GPT服务
pubDate: 2023-02-16T20:30:25
category: 工具/效率
excerpt: 简单记录一下。
---
本文首发于公众号【一只猫头猫】，平时记录一些自己做的好玩的东西，随便写写吧~

---
# 前言

很久没写小程序了，看到最近ChatGPT比较火，也想整个活玩一玩。于是花了一个周末做了个AI算命微信小程序，乐呵乐呵。先放一下最终的成品效果（小程序名字叫“赛博运势丨AI测命理”，微信直接搜也行）：

![](https://i.328888.xyz/2023/02/16/pne5k.jpeg)
![](https://i.328888.xyz/2023/02/16/pnBkq.jpeg)


# 技术栈
小程序端：Taro + React + sass
服务端：koa + rabbitmq + mongodb + redis

工程量不大，但麻雀虽小五脏俱全了属于是。本文会简单记录一下一些关键的步骤和实现思路，一些软件的安装服务就略过啦。接下来直入主题。

# 整体思路
## 需求描述
做一个AI算命的小程序，用户可以输入一些基础的个人信息，小程序需要根据个人信息推算出用户的其他信息，并根据推算信息查询运势。


## 实现思路
### 运势生成
首先OpenAI提供了官方的接口，去官网注册个账号，然后申领Key就可以直接通过API调用了。GPT系列目前有4种模型可以使用，分别是Davinci、Curie、Babbage和Ada，从前往后效果**依次变差**，但后边的速度**会更快**，价格会**更便宜**。我试了一下，后边3个模型在我给定的prompt上虽然很快，但表现稀烂，并且貌似只会回答英文，看来省钱是省不了了。

### 前后端通信
请求OpenAI的部分肯定是得由服务端完成。具体来说，需要小程序端调用服务端的接口，然后由服务端向OpenAI发起请求，等待结果返回后再吐给前端。

既然是服务端，最基础的就是引入一个启动服务的框架，这里用的是*koa*。

考虑到土豆般的服务器，以及同时向OpenAI发起的请求数需要有一定的限制，因此需要引入一个消息队列来达到**削峰**的目的；要不然万一一不小心瞬间发送了大量请求，服务可能就崩了。这里使用了*rabbitmq*。 
用消息队列还有个好处是**解耦**，换句话说，就是把*专门使用消息队列处理OpenAI请求*的进程和*直接向小程序端提供服务*的进程解耦开，这样其他应用也可以通过消息队列来直接使用GPT模型。

由于调OpenAI的**过程很慢**，假设我们从小程序端向服务器请求接口，由服务器发起一个调用OpenAI请求，我们不可能等个一两分钟一直等到这个请求返回结果。因此自然想到，需要把发起请求和查询结果分成两个接口，其中查询结果通过向服务器**轮询**的方式查询OpenAI是否已经给出结果。

既然是轮询，那肯定要保证**数据在一段时间内能被查询到**。那OpenAI返回的结果肯定要暂存在**数据库**中，简单起见，直接用*mongodb*就好了。考虑到轮询时候的查询性能，每次轮询都查询数据库太浪费了，因此中间需要加一层*redis*做缓冲。

到这里，整体的后端的技术选型就有了：**koa + rabbitmq + mongodb + redis**。至于小程序端，直接**Taro + React + sass**，和以前做的普通web项目体感没什么不同。

## 工程架构
大概画一个简单的示意图描述一下整体的架构：
![](https://i.328888.xyz/2023/02/16/pkXBP.png)


# 小程序端
小程序端其实没什么可写的，没踩太多坑，就是普通的UI加了一些花里胡哨的动画。唯一就是分享图片的时候，搜了半天没搜到啥靠谱的，还以为小程序canvas上绘制base64图片很麻烦。最后看了下微信官方文档，发现和普通canvas差不多，简单封装个方法：

```typescript
async function drawImage(
  canvas: any,
  base64src: string,
  dx: number,
  dy: number,
  width: number,
  height: number
): Promise<void> {
  if (!canvas || !img) {
    return;
  }
  const image = canvas.createImage();
  const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

  image.src = base64src;
  return new Promise((resolve) => {
    image.onload = () => {
      ctx.drawImage(image, dx, dy, width, height);
      resolve();
    };
  });
}
```
用这个直接在canvas上画就行了。

# 服务端
根据上边的描述，服务端部分分成了两半，一半是专门用来向OpenAI发请求和处理消息的GPT服务；另一个是和小程序端打交道的Koa服务。
## GPT服务
这块也分成两部分来说，第一部分就是怎么给OpenAI发请求调用GPT模型，第二部分是怎么使用消息队列和数据库。
### 调用GPT模型
这里用到了chatgpt库。这个库使用到了node18的原生fetch，因此它的package.json里有这么一行：
```json
"engines": {
    "node": ">=18"
}
```
也就是低于18.x版本的node环境下装这个包可能会报错。但是没关系，可以使用：
```bash
yarn add chatgpt --ignore-engines
```
来忽略环境的不匹配，在实际调用的时候引个polyfill就好了。引入polyfill有两种方式：
- 方法一： 安装node-fetch，然后给全局fetch赋值：
```typescript
import nodeFetch from 'node-fetch';
import { ChatGPTAPI } from "chatgpt";

globalThis.fetch = nodeFetch;

const api = new ChatGPTAPI({
    apiKey: YOUR_OPENAI_KEY,
});
```
- 方法二： 这个库的最新版在创建GPT实例的时候可以传入一个fetch参数，也就是：
```typescript
import nodeFetch from 'node-fetch';
import { ChatGPTAPI } from "chatgpt";

const api = new ChatGPTAPI({
    apiKey: YOUR_OPENAI_KEY,
    fetch: nodeFetch
});
```

接下来就可以通过sendMessage方法去发起请求了：
```typescript
api.sendMessage("假如你是一只小狗，你会对我说什么呢？").then(console.log);
```
等一会之后，就可以看到ChatGPT的回复：

![](https://i.328888.xyz/2023/02/16/pk1CU.png)

### 消息队列
安装rabbitmq的过程 网上教程一堆，就略过了~假定消息队列服务已经启动好了，直接说在node中的使用。首先安装一下amqplib库。  
安装完成之后，第一步是**连接消息队列服务**：
```typescript
import { connect } from 'amqplib';

// 注意后边带一个heartbeat参数，要不然时间长了无心跳连接可能会被关闭
let connection = await connect("amqp://127.0.0.1?heartbeat=180");
```
第二步是**创建一个channel**。建立连接以后，所有的消息队列有关的amqp协议操作，都会通过channel完成：
```typescript
let channel = await connection.createChannel();
```
第三步是**创建一个交换机**，并为它绑定一个队列。在这里采用的是直连，通过duration开启了持久化，从而下次重启的时候，队列中的内容还可以恢复：
```typescript
const exchangeName = "chat-gpt-exchange";
const key = "request-queue";
await channel.assertExchange(exchangeName, 'direct', {
    durable: true, // 持久化
})
// 创建名为key的队列
await channel.assertQueue(key);
// 绑定队列，三个参数分别为：队列名，交换机名，路由名
await channel.bindQueue(key, exchangeName, key);
```
第四步是**削峰和处理逻辑**的部分。需要注意，noAck需要设置为false，一直等到消息处理完成手动触发ack，这时才会在队列中取下一个。
```typescript
// 每次从消息队列中按顺序取出10个进行消费
await channel.prefetch(10);
// 具体的消费方法，msg是从队列中取出的内容，这里我传来的是一个json
await channel.consume(key, async msg => {
    try {
        const content = msg.content.toString();
        const jsonContent = JSON.parse(content);
        const result = await chatgptApi.sendMessage(jsonContent.msg, jsonContent.options);
        const id = jsonContent.id;
        // 写入redis, ttl设置为10分钟（直接使用redis包，调用redis.createClient然后就可以直接调了）
        redisClient.set(`${namespace}${id}`, JSON.stringify(result), {
            EX: 600
        });
        // 写入mongodb，略过了
        // ...
        channel.ack(msg);
    } catch {
    }
    channel.ack(msg);
}, {
    noAck: false,
})
```

### 数据库
为了减少服务器的负担，存储在mongodb和redis中的数据都做了定时删除。操作mongodb用的是mongoose库，定时删除的方法也很简单，在创建Schema的时候设置一下createAt属性就好了：
```typescript
const resultsSchema = new mongoose.Schema({
    /** 请求ID **/
    reqId: {
        type: String,
        required: true
    },
    /** 请求结果 */
    result: {
        type: Object
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: {
            expires: '1h' // 设置1小时后自动过期，过期后会自动删除
        }
    }
});
```

## Koa服务
这个服务就是卡在中间，作用就是处理来自小程序端的请求，不停的往消息队列里面塞信息，不停的查询redis和数据库。具体来说，除去和微信小程序打交道的部分，主要的接口就两个：start（发起调用GPT的申请）和query（查询请求结果）
### 开始查询
这里的逻辑和上边消费的部分其实有些类似，依然是创建连接、创建channel、创建队列，不过是由消费变成了生产：
```typescript
import { connect } from 'amqplib';

let connection = await connect("amqp://127.0.0.1?heartbeat=180");
let channel = await connection.createChannel();
const exchangeName = "chat-gpt-exchange";
const key = "request-queue";
await channel.assertExchange(exchangeName, 'direct', {
    durable: true, // 持久化
})
// 创建名为key的队列
await channel.assertQueue(key);
// 绑定队列，三个参数分别为：队列名，交换机名，路由名
await channel.bindQueue(key, exchangeName, key);

/** 以上代码和消费端一模一样 */
const reqId = 'xxx';
// 生产消息
channel?.publish(exchangeName, key, Buffer.from(JSON.stringify({
    reqId: reqId,
    msg: '假如你是一只小狗，你会对我说什么？',
    options: {} // chatgpt的options参数
})));
// 在redis中打个标记
redisClient.set(reqId, 1, {
    EX: 600 // 过期时间
});
```

总结起来使用消息队列也不是很复杂。需要注意的是，在生产消息的同时给redis中打个标记，意思是这条请求已经在处理中了。如果不这样的话，在下边轮询的时候在redis中以reqId为key获取到的值是null，会使得每次查询都无法命中redis，始终穿透到mongodb数据库。这样就失去使用redis的意义了。

### 查询结果
查询结果的代码就不啰嗦了，总之：第一步查redis，redis中记录了请求的状态；如果没有就查mongodb，如果mongodb还没有，那就证明这个请求已经过期了，直接返回失败。

# 总结
总结起来，这一个练手的小项目还是用到了不少知识的。通过以上描述，也可以大概搭起一个比较稳定（虽然速度堪忧）的chatgpt服务。之后还可以做什么就自由发挥了~

最后贴一下这个小程序的二维码，感兴趣的可以去试试算个运势~（仅供娱乐~ 5分钟内应该会返回结果，比较慢）

![](https://i.328888.xyz/2023/02/16/p00Rt.jpeg) 
