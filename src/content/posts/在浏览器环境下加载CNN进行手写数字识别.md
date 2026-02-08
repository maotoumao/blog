---
title: 浏览器环境下加载CNN进行手写数字识别，并部署到gitee page
pubDate: 2021-09-25T01:34:42
category: 算法&AI
excerpt: 用Pytorch训练LeNet-5实现手写数字识别，并将模型在浏览器端进行加载。
---
# 前言
尝试一下用Mnist数据集训练一个简单的CNN网络，然后搭建一个静态页面，在浏览器端加载模型使用canvas区域的内容预测手写数字。模型使用Pytorch编写，用cpu训了10个epoch之后导出为onnx模型。之后在浏览器端通过onnxruntime-web进行加载，并进行预测。

![这是一个2](https://ss.im5i.com/2021/09/25/lJsvm.jpg)
![这是一个7](https://ss.im5i.com/2021/09/25/lJJeq.jpg)

# 模型
模型代码其实网络上已经有很多了，原理和细节也不再赘述；需要注意的是，输入是一个Batchsize x 1 x 28 x 28 的矩阵，输出为Batchsize x 10的矩阵也就是说第一维是动态的，这就决定了我们在导出为onnx模型时的写法：
``` python
def transformToOnnx(model, batch_size, name='mnist.onnx'):
    model.eval()
    x = torch.randn(batch_size, 1, 28, 28)
    torch.onnx.export(model, x, name, export_params=True, opset_version=11, do_constant_folding=True, input_names=[
                      'input'], output_names=['output'], dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}})
```
首先需要使用model.eval()将模型切换为预测模式，接下来我们随机生成一个输入的参数，也就是Batchsize x 1 x 28 x 28大小的一个随机矩阵。在导出时需要指定导出的路径，输入和输出的符号（上边的写法意思是在后续加载模型的时候，输入变量名为input，输出变量名为output）。同时由于输入和输出的第一维都是batchsize，因此把它们指定为动态轴。

# 前端实现
## 初始化工程
首先采用vite初始化一个react-ts项目，这一步没有太多注意事项。

## 模型的加载和预测
为了加载模型，我们需要使用onnxruntime-web。onnxruntime-web是一个可以在浏览器环境下和nodejs环境下加载onnx模型的库，可以在CPU和GPU上运行，CPU使用web assambly来加载模型，而GPU使用Webgl来加载，默认运行在CPU上。两种方案支持的符号集不同，wasm方式支持全部的符号集，而webgl方式仅仅支持一部分符号集（具体的说明参考文献[1]）；除此之外，在ios的chrome、edge和safari浏览器中仅支持wasm。本次小实验导出的模型如果采用webgl加载，就会遇到上边提到的符号集的问题，因此采用wasm加载模型。我们只需要：
```
yarn add onnxruntime-web
```
便可以在工程中安装这个包了。

接下来我们需要对vite工程进行一些配置。由于vite在启动server时有一个pre-bundle的过程，使用esbuild将各种非标准的模块转化为es6模块。onnxruntime-web中使用到了export namespace xx的写法，这些会在pre-bundle的时候报错，因此我们可以选择通过pre-bundle过程；

同时，即便我们跳过了pre-bundle的过程，我们会发现在项目启动之后，onnxruntime-web会自动的去static/js路径下去找两个wasm文件，而在启动服务和打包的时候并不会自动的加入这两个文件。而如果我们引入cdn上的onnxruntime-web库，我们会发现它会自动地去cdn地址请求wasm文件，cdn上这两个文件自然是存在的。参考onnxruntime给出的demo[2]，可以看到，官方在使用webpack打包的时候也是使用了CopyWebpackPlugin将对应的文件拷贝到打包之后的目录中。为了方便开发和打包，建议首先跳过pre-bundle过程，然后采用cdn加载onnxruntime-web包，并在vite.config.js中声明该包为external，即：
``` javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteExternalsPlugin } from 'vite-plugin-externals'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteExternalsPlugin({ // 声明为external
      'onnxruntime-web': 'ort'
    })
  ],
  optimizeDeps: {
    exclude: [ // 跳过pre-bundle
      'onnxruntime-web'
    ] 
  },
  base: '/mnist-demo/'
})
```
然后在index.html中加上库的cdn地址：
``` html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>

```

接下来的过程其实就很简单了，我们成功的引入了onnxruntime-web库，然后需要用它来加载模型，并进行预测：
``` javascript
...
    // 加载模型
    const session = await ort.InferenceSession.create(model);
    // 输入数据，第一个参数是数据类型，第二个参数inputArray是一个一维数组，第三个参数表示的是维度，注意需要和之前模型导出时定义的维度相一致，即：dynamic x 1 x 28 x 28
    const inputs = new ort.Tensor("float32", inputArray, [1, 1, 28, 28]);
    // 使用run进行预测，需要注意的是，输入和输出与之前导出时定义的输入输出变量名一致
    const outputs = await session.run({
        input: inputs,
      });
    // 预测结果
    console.log(outputs.output.data);
```

到此为止，在浏览器加载模型的部分就完成了，接下来只需要想个办法获取到用户输入的数据，并使用这些数据进行预测。

## 获取输入数据
模型输入是1x28x28的图片，而让人在屏幕上手动的去在一个28像素x28像素的区域内绘制肯定是个不现实的事情（太小了）。因此我们需要把输入的canvas放大（这里采用的是300x300），在预测时对画布的输入进行缩小,并转化为单通道。

为了获取到这个300x300区域内的像素数据，我们使用canvas.getImageData()获取到这个区域内的rgba数组。接下来，我们需要将它缩放为28x28的大小。这里引入了pica库，使用pica的resizeBuffer函数对像素区域进行缩放。

由于canvas的默认颜色是黑色透明，因此我们拿到的数组的非画笔区域的rgba值为(0,0,0,0)。同时注意到模型的输入中，灰度的取值范围为-1-1，因此为了保留单通道，我们保留a，并将其根据是否为0，简单地映射到-1和1就够了。

还需要注意的是，由于画布会从300x300缩放到28x28，因此canvas画笔的粗细也是一个影响效果的因素：如果画笔过细，缩放之后画布区域的像素值都是0，也就没有效果了；如果画笔过粗，可能缩放之后，原本隔着很远的两个区域变成了邻居，也会影响效果。

最后，我们只需要根据上述操作，根据缩放、处理过后的数组构建输入的Tensor，并传入模型进行预测就可以了。

## 总结
到这里，其实模型的加载、预测和如何获取输入数据都已经完成了。最后就是把以上的东西串起来。实际的效果就是最上边两张图的样式，我把它放在了gitee page上，实测网络请求的速度还可以接受：
![加载速度](https://ss.im5i.com/2021/09/25/lJEUs.png)
同时我也把它部署在我的服务器中，模型丢到cdn上，速度也还可以接受（gzip对模型好像压不了多少呀。。）：
![加载速度](https://ss.im5i.com/2021/09/25/lJUiQ.png)

也就是说，对于一些简单的模型，我们完全可以丢到gitee page上进行使用，还是蛮好玩的。

最后丢个页面地址和仓库地址，有人需要的话我再去补readme，球球点个关注和star吧：

### 页面地址：

[Gitee Page版本](http://maotoumao.gitee.io/mnist-demo/)

[部署到nginx的版本](http://example.upup.fun/mnist)


### 仓库地址：

[Github仓库](https://github.com/maotoumao/mnist-demo/)

[Gitee仓库](https://gitee.com/maotoumao/mnist-demo)

[个人博客](http://blog.upup.fun)

[原文地址](http://blog.upup.fun/2021/09/25/%E5%9C%A8%E6%B5%8F%E8%A7%88%E5%99%A8%E7%8E%AF%E5%A2%83%E4%B8%8B%E5%8A%A0%E8%BD%BDCNN%E8%BF%9B%E8%A1%8C%E6%89%8B%E5%86%99%E6%95%B0%E5%AD%97%E8%AF%86%E5%88%AB/)

---

### 参考文献
[1] onnxruntime web: https://www.npmjs.com/package/onnxruntime-web#Operators

[2] onnxruntime-web使用demo https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/quick-start_onnxruntime-web-bundler

