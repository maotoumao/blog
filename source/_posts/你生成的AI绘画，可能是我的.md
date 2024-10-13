---
title: 你生成的AI绘画，下一秒就是我的了
date: 2023-02-20 22:21:46
categories:
 - 前端
tags:
 - html
description: 简单写个爬虫吧。
---
# 前言
（先说好，本文还是一个技术探索文章！）   
书接上回。上次开了点小脑洞，在AI绘画和ChatGPT的帮助下做了个小程序。其中，AI绘画使用的是MidJourney程序，它帮我生成了一些精美的图片，稍作修改后就用到了我的小程序里。

![](https://i.328888.xyz/2023/02/20/giTHv.md.png)

MidJourney架设在Discord网站上，通过给Discord机器人发送指令来生成图片。在下图中的聊天框中输入“/imagine 关键词”指令，过一会你就可以收到下图中的四宫格图片。你可以对其中任意一张图**添加一些细节(upscale)**或者**做一些变动(variation)**，然后MidJourney就会根据这张图片生成一张高清大图:
![](https://i.328888.xyz/2023/03/01/6cMlJ.png)

然而，MidJourney程序每个新账号只能**免费使用25次（包括四宫格图）**，再用的话就需要氪金了。作为一只铁公鸡，那自然得想想怎么样在*不花钱的情况下多整点AI美图*。我们可以注意到，如果不加设置的话，别人生成的AI画作也会展示在聊天室中，并且貌似也很精美。那不如…… 全都下载下来
![](https://pic.diydoutu.com/bq/006mowZngy1ftqn2dnsctj308b09qmxl.jpg)


当然，也要注意一下版权声明，中文版的协议链接[戳这里](https://creativecommons.org/licenses/by-nc/4.0/legalcode.zh-Hans)，至少可以在非商用的场景下可以复制和分享：
![](https://i.328888.xyz/2023/03/01/6mRGP.png)

# 我全都要
既然这样，那我就不客气了，想办法给它全都下下来。先来看看这个网页的结构吧。

从下图可以发现，这个网站的所有的聊天信息都在一个ol结点中，其中**每一条消息都是一个li结点**。 
![](https://i.328888.xyz/2023/03/01/6mqkZ.png)

AI生成图片需要时间，而这段时间内的生成的中间状态的图片为.webp格式，**最终生成的图片是.png格式**：
![](https://i.328888.xyz/2023/03/01/6plAN.png)
![](https://i.328888.xyz/2023/03/01/6pNka.png)

同时，ol中li结点的数目并不是无限扩大的，**到了一定的数目就会复用**，估计是代码里有限制。同时，更新数据消息是从**websocket**中接收的。

我们的目的是获取网页中**所有的图片和prompts**。为了达到以上目的，我们有两种思路：
1. **拦截websocket消息**，把里面关于的图片url的部分找出来并下载。
2. 既然dom结构那么规整，那就直接从dom入手，**解析下dom结构**找出所有png格式的图片然后下载。

显然，第二种成本更低一些。方案敲定，那就开始coding吧~

# 解析dom
我们先来写个简单的脚本把网页中AI生成的图片全都扒下来。符合要求的图片满足以下条件：
- 在ol标签下的li标签内；
- 图片url在a标签的href属性内；
- **图片消息的发送方是Midjourney Bot**  

第三点尤为重要，因为Midjourney可以图生图，所以你可能会看到有些老哥突然发了自己的自拍…… 

至于Prompts，我们可以发现它是粗体，被< strong >标签包裹。

依据以上，我们可以写出一段非常简单的脚本：
``` typescript
// 找到ol，它的class以scrollerInner-开头
const contentList = document.querySelector('ol[class^="scrollerInner-"]');
// 找到所有的li标签
const lis = Array.from(contentList.children).filter(
    (item) => item.tagName === "LI"
);

lis.forEach((li) => {
    parseLiNode(li);
})

function parseLiNode(li) {
    // 截取一个唯一的id
    const id = li.id.substring(14);
    // 粗体部分
    const prompts = Array.from(
      li.querySelector("div[id^=message-content-]>strong")?.childNodes ?? []
    )
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(" ");
    // 取出a标签的href
    const url = li.querySelector(
      "div[class^=messageAttachment] div[class^=imageWrapper] a[data-role=img]"
    )?.href;
    console.log(id, prompts, url);
}


```
贴到控制台，就可以看到这段脚本已经把网页中所有的AI画作的url和prompts打印出来了：

![](https://i.328888.xyz/2023/03/02/6XiGC.png)

然而这还只是刚刚开始，这段脚本只能打印**当前出现在页面**中的画作，对于后边新生成的可就无能为力了。为了让它不断的获取到最新生成的画作，我们还得做一些额外的操作。
# MutationObserver
为了达成上一节结尾的目的，第一反应就是使用setInterval，隔段时间重新扫描下页面中的png图片。不过你可能猜到了我肯定没用它，要不然这一章的标题就该改名了。

没用setInterval的原因相信大家也猜得到：用户生成AI画作的频率不稳定；如果setInternal频率高了，可能会造成浪费；如果频率低了，可能某个时间段内很多用户疯狂生成图片，我们可能会丢失某些图片的信息。

因此，我们可以使用更精准的方式获取到dom结构的变动——**MutationObserver**。

## 用法
先看看MDN上的介绍：

![](https://i.328888.xyz/2023/03/02/6Blg8.png)

一个MutationObserver对象只有三个方法，使用示例也相对简单 （下边是从mdn上抄的）：
```javascript
 // 选择需要观察变动的节点
const targetNode = document.getElementById('some-id');

// 观察器的配置（需要观察什么变动）
const config = { attributes: true, childList: true, subtree: true };

// 当观察到变动时执行的回调函数
const callback = function(mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    for(let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.');
        }
        else if (mutation.type === 'attributes') {
            console.log('The ' + mutation.attributeName + ' attribute was modified.');
        }
    }
};

// 创建一个观察器实例并传入回调函数
const observer = new MutationObserver(callback);

// 以上述配置开始观察目标节点
observer.observe(targetNode, config);

// 之后，可停止观察
observer.disconnect();
```

上边的示例程序翻译成人话就是：
- 新建一个MutationObserver对象
- 它监测targetNode节点
- 在config定义的监测内容发生变化时执行callback

其中，config定义的监测内容表示：当target**及其子结点(subtree为true)**发生**属性变化时(attribute为true)**，或**其子结点发生新增/删除时(childList为true)**触发回调。

有了这个东西，获取网页中新生成的图片就容易多了。

## 实战
前面分析过，discord聊天记录中最大条目是有限制的，因此我们会监测到li结点的新增或者删除。除此之外，因为照片可能会实时更新，因此也可以监测到li内class为imageWrapper的div会有属性变动。这两部分对应的图片可能有交集，因此可以用一个set去重。

我们只需要获取到新增的li结点，然后找到class变动的div的祖先li结点，取并集之后就可以得到页面中新增的AI画作元素了。

``` typescript
let mutationObserver: MutationObserver;
async function startObserve() {
  mutationObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      const addNodes = record.addedNodes;
      if (
        record.type === "childList" &&
        addNodes?.length &&
        (record.target as Element).tagName === "OL"
      ) {
        // ol标签的childlist变动，取出其中新增的li结点
        addNodes.forEach((node) => {
          const li = node as HTMLElement;
          if (
            !(li.tagName === "LI" && li.id.startsWith("chat-messages-"))
          ) {
            return;
          }
          parseLiNode(li); // 解析这个li结点
        });
      } else if (
        record.type === "attributes" &&
        record.attributeName === "class" &&
        (record.target as Element).tagName === "DIV" &&
        (record.target as Element).className.includes("imageWrapper")
      ) {
        // 属性变动的div
        let li: Element | null | undefined = record.target as Element;
        while (li?.tagName !== "LI" && li) {
          li = li.parentElement;
        }
        if (li) {
          parseLiNode(li);
        }
      }
    });
  });
  const contentList = document.querySelector('ol[class^="scrollerInner-"]');
  if (!contentList) {
    return;
  }
  mutationObserver.observe(contentList, {
    attributes: true,
    childList: true,
    subtree: true,
  });
}

startObserve();

```
把这段程序拷到控制台（把类型信息删掉就好了，上边代码是ts），便可以持续不断地打印出新的画作信息了：
![](https://i.328888.xyz/2023/03/02/6XAMJ.png)

# 下载
获取AI画作的信息是搞定了，接下来就是如何下载了。一张一张下载肯定是不太行（要不然一小会文件夹内就会下载得满是png文件），直接用jszip打包下载一下，使用方式也很方便：
```typescript
import JSZip from "jszip";

const zip = new JSZip();

const binaryBlob = fetch("image-cdn-url").then(_ => _.blob());

// 在压缩包内放一个名字是fileName.png的图片，图片是二进制blob
zip.file(`fileName.png`, binaryBlob, {
    binary: true,
});

// 下边的zipContent就是生成的zip压缩包
zip.generateAsync({ type: "blob" }).then(zipContent => {
    saveFile(zipContent, `midjourney-${Date.now()}.zip`) // saveFile的实现略过了~
})
```

# 结尾（源代码在这里！）

最后就简单润色下，加上一些规则限制（比如说过滤掉四宫格的图片，只保存大图）、下载限制（每攒80张图下载一次，大概100+M）、用户名检查（有时候Discord机器人会批量发消息，这个时候用户名会被略过）等等，再用esbuild打到一个bundle里，就完成啦。

28号那天挂了一整天，然后下班回来就收获了满满**2G**（**两千多张**）高清图片……

![](https://i.328888.xyz/2023/03/01/6mMdv.png)


## 代码开源~ 不要干坏事哟：
使用方式在readme里啦。
https://github.com/maotoumao/midjourney-downloader

如果你觉得好玩，不如点个star；如果你觉得有用，那你可以去公众号【一只猫头猫】留言“猫头猫真棒”，我也会夸夸你~

下次整活的时候再见~


# 最最最后放些收集的美图
![](https://i.328888.xyz/2023/03/02/6XRdU.png)
![](https://i.328888.xyz/2023/03/02/6Xcqv.png)
![](https://i.328888.xyz/2023/03/02/6Xp23.png)
![](https://i.328888.xyz/2023/03/02/6XBEy.png)

