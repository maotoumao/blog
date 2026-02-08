---
title: 【干货】React Native性能优化——长列表拖拽排序
pubDate: 2023-01-09T20:24:18
category: 前端
excerpt: 拖拽排序的简单优化方案，顺便记录下一些RN通用的优化思路。
---
# 前言
这是在做业余项目[MusicFree](https://github.com/maotoumao/MusicFree)时的一些技术探索，简单记录一下优化过程和思考方式。前情可以戳[这篇文章](http://blog.upup.fun/2022/10/04/%E5%86%99%E4%B8%80%E4%B8%AA%E5%85%A8%E7%BD%91%E6%9C%80%E5%85%A8%E7%9A%84%E9%9F%B3%E4%B9%90%E6%92%AD%E6%94%BE%E5%99%A8/)。

先来看最终的效果，再来说需求和实现：

<video src="http://storage.upup.fun/musicfree/313DA58C945D3DD5A4F005C0A6CDD29F.mp4" controls ></video>

在上述视频中可以看到，这是一个由628首歌曲构成的歌单**长列表**，主要功能是对歌单里面的歌曲进行**拖拽排序**和**批量选择操作**，看起来还是比较流畅的。


# 需求分析&实现思路
首先来明确一下需求，或者说最终要达到的目标吧。其实在前言部分已经够明确了，关键词就是**长列表**、**拖拽排序**和**批量选择**；作为一个业余项目，最终要达到的目标也掺杂着强烈的个人偏好：**不卡、实用**。

## 方案1：做一个调包侠
为了实现以上效果，第一反应就是寻找社区开源项目，看有没有类似的库。网上搜了一圈，还在维护的貌似就只有这个[react-native-draggable-flatlist](https://github.com/computerjazz/react-native-draggable-flatlist)库了。

抱着试试看的心态，我们把[代码写好](https://github.com/maotoumao/MusicFree/blob/draggable-flatlist/src/pages/musicListEditor/components/musicList.tsx)：
> 其实最早期简单试用了一下，就把这个方案否决掉了。原因也很简单，一方面是有点卡，另一方面是它不知道为啥会导致模拟器debug时崩溃。下面的对比实验视频是在最后确定方案之后做的，忽略交互方式和一些底色之类的，相关的优化都是相同的。

<video src="http://storage.upup.fun/musicfree/SVID_20230109_230717_1.mp4" controls></video>

可以发现其中有几点体验较差的地方：
1. 拖拽到顶自动滑动的时候，选中的元素好像一直在抖
2. 单选时选中状态反应较快（和最终版速度差不多，因为这里的优化一样）；但**全选、全不选有明显延迟**(~1s)
3. 拖拽结束后，**花费大量时间执行回调函数**（可以观察一下颜色，停止拖拽后选中的元素还会保持很长一段时间的选中态）

回顾下目标：
- 卡吗？卡。
- 实用吗？凑合能用。
- 满意吗？凑合能用可以，卡的这么明显忍不了。
- 那怎么办？自己写个吧。

## 方案2：自己实现
### 通用？定制？
既然要自己实现，那么还是得好好设计一下。第一个要思考的问题便是：要做一个通用方案还是做一个定制的方案。因为这可能会涉及到方案设计，如果要做一个通用方案，那可能会更少的trick，更多的配置来满足通用性和灵活性。如果是一个仅仅在当前项目中使用的方案，那就可以加很多**前提条件**和**折中技巧**了。      
仔细想了想，首先我在短期内不太会用React Native开一个新的有长列表的坑，其次我也不见得做的会比react-native-draggable-flatlist更好，也不必顾此失彼，先用个项目中的定制方案满足自己的需求就足够了。

### 怎么才能不卡？
第二个要思考的问题理所当然是如何实现目标了。那么自然有个问题：为啥会卡？   
想一想我们用的库是什么：react-native-draggable-**flatlist**。对，flatlist。简单来说，Flatlist在每次滚动时会**批量预渲染**一定区域内的元素，并把区域外的元素**销毁**。我们来看一下这张图就明白了：

![flatlist](http://storage.upup.fun/musicfree/K4BF_4TJA%7D1%7DISIGJ%5B%7DWEAT.png)

可以看出，始终会保持**120个元素**在内存中，每次滑动时会**销毁**不在区域中的元素。Shopify团队针对这一点进行优化开发了[Flashlist](https://shopify.github.io/flash-list/)，它的原理大概是首先渲染一定量的初始元素；但在滑动时滑出视窗的元素不会销毁，而是重复利用：

![flashlist](http://storage.upup.fun/musicfree/%29OM6%604OYJ%7BVK%7DP%29%28W%24IFZLC.png)

同时，由于其一次渲染到屏幕上的元素较少（20个之于120个），当**全选**时需要重新渲染的元素数目也会大大减少（简单算一下，少渲染5/6的内容）。它们官网上说相对于原生的Flatlist性能有5~10倍的提升，既然这样，那就用Flashlist好了。

![官网](http://storage.upup.fun/musicfree/G%7D%24VCM1F0I2W%28NGH%60_D%7B%28%40N.png)

### 拖拽排序怎么实现？
#### 再来一个问题
以上两个问题思考完了：为了达成目标，我们可以随意在实现时加一些前提/trick，并且我们要把flatlist切换成flashlist以提升长列表性能。接下来就是比较麻烦的地方了：**如何实现拖拽排序**。都思考了这么多问题了，不妨再多加一个问题：最终要实现的效果是**侧重UI交互**还是**侧重功能**？

如果侧重交互的话，可以大概设计一下理想的效果：
1. 在按住某一个元素上下拖动时，它需要出现在它正确的位置;
2. 并且它的兄弟元素都会被顺滑的挤到一边；
3. 滑动的位置越靠两端，滑动速度越快；
4. 在放手的一瞬间，它会立刻出现在它被移动到位置上。

从实现角度来说：
1. 在选中一个元素的一瞬间，它的zIndex会被重新设置;
2. 随着手指的拖动，它和它的兄弟元素的y轴位置都会通过setNativeProps调整；
3. 同时需要记录下手指位置距离列表两端的距离来决定是否需要继续scroll，以及下一个scroll的位置；
4. 在放手的一瞬间，这些元素的位置和y轴位置（因为通过setNativeProps改过了）会被重新计算。

确实，想的挺好，但Flatlist（Flashlist的参数和原生flatlist类似）连scroll的速度都难控制，更别说这些特殊的效果了。再想想目标，交互可以砍一些，果断**侧重功能**。

#### 前提条件
啰嗦了这么多，其实都是为了给最终实现减少难度。现在我们可以比较放肆的给拖拽排序列表加前提条件了：
- 列表距离顶部和底部的距离已知
> 反正是个个人项目，那我有理由要求整个APP中所有的拖拽列表样式保持一致。这也就意味着列表高度可以直接简单算出来。

- 列表里面的元素高度、布局稳定，不会随着状态的变化有较大变化
> 这样即便有需要传进来的样式，可以用ref存下样式；参数变化导致重新渲染时不需要重新创建样式对象；同时很多布局信息，如当前位置等也可以简单的算出来。

- 交互方式固定，每个元素的右边有个小按钮，只能靠这个按钮进行拖拽
> 统一交互的话，这样控制拖拽的逻辑可以直接做在列表组件内部了。具体一点说，通过列表传入的renderItem参数渲染的组件仅仅是下图中的红色部分；蓝色区域用来控制拖拽；拖拽的逻辑和样式仅仅由列表组件内部控制：

> ![](http://storage.upup.fun/musicfree/iPhone%2014_13%20Pro.png)

- 目标元素拖动时，它的兄弟元素位置不会出现变化；目标元素拖到哪个元素的上方，就代表它最终会被移动到哪个位置
> 这样只需要通过setNativeProps改变一个元素的属性，甚至可以通过一些trick完全不改动列表元素。

前提条件加完了，是时候开始设计技术方案了。

# 技术方案

把拖拽排序这个问题分解一下，又可以拆成几个子问题：
- 滚动行为
- 高亮元素
- 结束回调  
接下来就尝试从这几个角度去设计一下。

## 滚动行为
### 整体结构
滚动行为还是比较明了的。首先，列表是一个FlashList（删掉了很多无关代码，代码多了不好看），相关的事件以及需要在这些事件内关注的行为如下：
```typescript

/** */
function SortableFlatList() {
    // 不要干扰原始数据
    const [_data, _setData] = useState([...(data ?? [])]);
    // 是否禁止滚动
    const [scrollEnabled, setScrollEnabled] = useState(true);
    // 是否处在激活状态, -1表示无，其他表示当前激活的下标
    const activeRef = useRef(-1);
    // content偏移值 用来记录滚动距离
    const contentOffsetYRef = useRef<number>(-1);
    // 目标在屏幕内移动距离
    const targetOffsetYRef = useRef<number>(0);
    // 当前移动的方向，0表示不移动，1表示向下，-1表示向上
    const direction = useSharedValue(0);

    return <FlashList
                scrollEnabled={scrollEnabled}
                ref={_ => {
                    // list的引用，需要用它控制滚动
                }}
                onLayout={evt => {
                    // 布局信息，需要用它拿到尺寸
                }}
                data={_data}
                estimatedItemSize={itemHeight} // 这里其实是每一个元素的高度，直接固定了，也是一个优化项
                scrollEventThrottle={16} // 滚动事件的节流回调
                onTouchStart={e => {
                    if(activeRef.current !== -1) {
                        // 触摸开始时，如果是在拖动状态，那就需要记录下初始位置
                        // 高亮元素
                    }
                }}
                onTouchMove={e => {
                    if(activeRef.current !== -1) {
                        // 移动时，如果在拖动状态，需要更新滚动速度，并记录移动的距离
                        // 修改高亮元素位置
                    }
                }}
                onTouchEnd={e => {
                    if(activeRef.current !== -1) {
                        // 如果是拖动状态，那就执行最终的回调
                        // 重置样式
                    }
                }}
                onTouchCancel={() => {
                    // 取消时所有的符号位和状态
                }}
                onScroll={e => {
                    // 在这里记录下y轴的偏移
                    if(activeRef.current !== -1) {
                        // 滚动时，如果在拖动状态
                    }
                }}
                renderItem={({item, index}) => {
                    return (
                        <SortableFlatListItem/> // 渲染一个满足前提条件的特定元素：它固定右侧是一个用来拖拽的小按钮，高度也是固定的。
                    );
                }}
            />
}


function _SortableFlatListItem(props: ISortableFlatListItemProps) {
    const {
        setScrollEnabled,
        renderItem,
        setActiveItem,
        item,
        index,
        activeRef,
    } = props;


    return (
        <View>
            {renderItem({item, index})}
            <Pressable
                onTouchStart={() => {
                    if (activeRef.current !== -1) {
                        return;
                    }
                    /** 使用ref避免其它组件重新渲染; 由于事件冒泡，这里会先触发 */
                    activeRef.current = index;
                    /** 锁定滚动 */
                    setScrollEnabled(false);
                    setActiveItem(item);
                }}
                style={styleRef.current.btn}>
                <Icon name="menu"/>
            </Pressable>
        </View>
    );
}

const SortableFlatListItem = memo(
    _SortableFlatListItem,
    (prev, curr) => prev.index === curr.index && prev.item === curr.item,
);
```
以上代码中SortableFlatList就是暴露给外部模块直接使用的列表，列表内部其实是用SortableFlatListItem，它由两部分构成，左边一半是使用renderItem直接渲染的组件，右边一半是仅可以用来拖拽的一个Icon按钮。  

我们会遇到的第一个问题是**禁用滚动的时机**。当拖拽组件时，整个列表需要禁用滚动（仅可以由列表的ref手动控制滚动），不然的话随着拖拽可能触发了滚动事件，导致拖拽失效。由于禁用/启用滚动一定需要重新渲染列表，因此scrollEnabled是一个state，在_SortableFlatListItem的Icon按钮的触摸事件中设置它为false即可，也就是代码中锁定滚动注释的下面那行。

第二个问题则是，如何记录**当前正在拖拽的元素**，以及这个元素的**初始位置**。根据之前的描述，正在拖拽的元素具有高亮效果，这个高亮效果必然是通过一个**state**控制的；我们可以在SortableFlatListItem中Icon按钮的onPress事件中触发setActiveItem，来更新当前的选中项。而为了得到这个元素的初始位置，我们必须想办法把用户**触碰Icon按钮时的坐标**传递给SortableFlatList。

为了得到这一部分，这里用了一些小小的trick：我们知道React Native的事件也有**冒泡机制**，也就意味着事件会从子组件冒泡到父组件。

具体一些说：子组件SortableFlatListItem中Icon按钮的onTouchStart会先触发，接下来会冒泡到SortableFlat的onTouchStart事件。这就给了我们一些可乘之机：我们可以再使用一个ref记录当前是否处于拖拽态，也就是代码中的activeRef，至于它的值，存放**拖拽中元素的下标**就完全足够了。

如果触发拖拽，那么在Icon按钮的onTouchStart中同时更新activeItem和这个activeRef。接下来，事件会冒泡到SortableFlatList中，这时父组件的onTouchStart捕获到的activeRef已经被标记为处于拖拽状态，根据它的值便可以轻松判断当前的状态，并决定要不要记录下在列表中的初始位置；而此时activeItem作为一个state还没有被更新为最新的状态。总之，**在父组件（也就是列表中）所有的eventhandler中都使用activeRef判断，activeItem作为状态仅仅用于更新高亮状态。**

### autoscroll
整体结构说完了，接下来要考虑的就是拖拽到两端的情况了。React Native的scroll还是有点难用的，没办法控制滚动速度。而为了达到最初设想的：拖拽到两端时会自动滚动，且滚动速度和距离两端的位置有关，那就不得不用点trick。

trick的原理其实也比较好理解：
1. 如果当前在滚动中，不做处理。
2. 如果当前拖拽的元素超过了某一阈值，且当前没有在滚动中，那么根据**当前拖拽元素的位置**计算**方向**以及**滚动的目标位置**，并触发滚动。
3. 在onScroll事件中监听（注意节流），在当前滚动的距离与目标位置比较接近时，判断**触发下一次滚动**
4. 如果当前位置已经无法在滚动，停止滚动。

除了上述方案，不断地setTimeout或者setInterval也可以完成目的，事实上最初的版本也确实这么做的，只不过看起来会忽快忽慢。

在实现的过程中，也使用了reanimated提供的useSharedValue来存储方向，并使用useDerivedValue在方向变化时及时地在不触发重新渲染的情况下进行滚动。

控制滚动的代码如下：
``` typescript
function scrollToTarget(forceScroll = false) {
    // 未进行拖拽
    if (activeRef.current === -1) {
        scrollingRef.current = false;
        return;
    }
    // 滚动中就不滚了 
    if (scrollingRef.current && !forceScroll) {
        scrollingRef.current = true;
        return;
    }
    // 方向是0, 也就是没有在滚动
    if (direction.value === 0) {
        scrollingRef.current = false;
        return;
    }
    // 下一次滚动到的位置
    const nextTarget =
        Math.sign(direction.value) *
            Math.max(Math.abs(direction.value), 0.3) *
            300 +
        contentOffsetYRef.current;
    // 当前到极限了
    if (
        (contentOffsetYRef.current <= 2 &&
            nextTarget < contentOffsetYRef.current) ||
        (contentOffsetYRef.current >=
            listContentHeight - (layoutRef.current?.height ?? 0) - 2 &&
            nextTarget > contentOffsetYRef.current)
    ) {
        scrollingRef.current = false;
        return;
    }
    scrollingRef.current = true;
    // 超出区域
    targetOffsetYRef.current = Math.min(
        Math.max(0, nextTarget),
        listContentHeight - (layoutRef.current?.height ?? 0),
    );
    // 开始滚动
    listRef.current?.scrollToOffset({
        animated: true,
        offset: targetOffsetYRef.current,
    });
}

```
列表中onScroll的事件也十分简单粗暴：
```typescript
onScroll={e => {
    contentOffsetYRef.current = e.nativeEvent.contentOffset.y;
    // 与目标距离小于2像素就强制再滚一次
    if (
        activeRef.current !== -1 &&
        Math.abs(
            contentOffsetYRef.current -
                targetOffsetYRef.current,
        ) < 2
    ) {
        scrollToTarget(true);
    }
}}
```

## 高亮元素
根据上边的一大通分析，在这里已经把高亮简化成了“浮在列表上，且拖拽中的兄弟元素不需要移动位置”。在这个前提下，我们考虑到的思路有两种：

- 给list传入一个额外的extra字段，其中放上activeItem；当activeItem变化时逐个元素进行比较，并更新对应元素的样式
- list完全不动，在列表上再浮一个长的一模一样的列表元素，直接更新它就好了

显然是第二种思路更简单一些。并且由于list的元素有memo，在拖拽时甚至list中的元素都不会重新渲染：
![代码截图](http://storage.upup.fun/musicfree/QQ%E5%9B%BE%E7%89%8720230110234021.png)

而对这个“假高亮”的控制，只需要通过setNativeProps在开始拖拽时更新它的top、opacity和zIndex，滑动时更新它的top，并在拖拽结束时更新zIndex为-1，opacity为0隐藏掉，看起来似乎就是完全跟手的了：
```typescript
    // ...
    onTouchMove={e => {
        fakeItemRef.current!.setNativeProps({
            top: offsetRef.current,
            opacity: 1,
            zIndex: 100,
        });
    }}
    onTouchEnd={e => {
        fakeItemRef.current!.setNativeProps({
            top: 0,
            opacity: 0,
            zIndex: -1,
        });
    }}
    onTouchCancel={e => {
        fakeItemRef.current!.setNativeProps({
            top: 0,
            opacity: 0,
            zIndex: -1,
        });
    }}

```

## 执行回调
接下来就需要拖拽结束后的处理了，这里其实是比较轻松的一步。在一通操作之下，我们记录下了某个元素在屏幕内移动的距离和列表滚动的距离，又强行限制住了列表的高度，那拖拽后的位置就很容易计算出来了：
```typescript
    onTouchEnd={(e) => {
            // ...
            // activeRef.current是初始下标，计算一下偏移即可
            index =
                activeRef.current +
                Math.round(
                    (e.nativeEvent.pageY -
                        initDragPageY.current +
                        initDragLocationY.current) /
                        itemHeight,
                );
            // 注意范围约束
            index = Math.min(data.length, Math.max(index, 0));
            // 起始下标: activeRef.current  结束下标: index
            if (activeRef.current !== index) {
                // 计算下排序后的数组
                let nData = _data
                    .slice(0, activeRef.current)
                    .concat(_data.slice(activeRef.current + 1));
                nData.splice(index, 0, activeItem as T);
                // 执行回调
                onSortEnd?.(nData);
            }
        }
    }           
```



到这里就算差不多了，最终的效果也如开头的视频那样，大概看起来还可以。不过细看还是有瑕疵，比如点击时的水波纹效果无法扩散到拖拽按钮的位置，这也可以通过优化布局来解决（设置列表项宽度为屏幕宽度，拖拽按钮的position设置为absolute并放在列表项上层，也就是并排改成折叠）。但总体问题不大。

# 其他优化思路
这些是我在做的过程中的一些其他的优化思路和想法，也简单记录一下吧。
## 状态合并
这里指的是把和一个对象相关的一一对应的状态合并到一个对象中，或者说如果某些状态之前有比较强的关联关系，那似乎可以合在一起。比如：
```typescript
[list, setList] = useState<any[]>([]);
[listChecked, setListChecked] = useState<boolean[]>([]);
```
可以合并成：
```typescript
[checkList, setCheckList] = useState<Array<{listItem: any, checked: boolean}>>([]);
```
因为如果分开，需要修改list和listChecked时某些情况下可能会使元素被渲染两次，并且用memo优化时也需要写两个判断条件。

## 把renderItem返回的组件用memo进行缓存
就以本文中的选中为例，所有的选中状态都存在一个数组中，当一个元素被选中时，这个数组也会整个更新（重新生成一个新的数组），从而引发列表重新渲染，每个renderItem都会被调用一遍，而显然其他的所有元素都是不需要重新渲染的。因此用memo做缓存就很有必要。  
个人感觉，给renderItem的组件做memo似乎更重要一些，但官网只写了renderItem不要用匿名函数（尽管我总觉得这个好像没啥用，因为重新渲染的话不管用不用匿名函数都会重新生成一个函数对象，也可能是我理解不到位吧）。同时renderItem要尽可能的轻量（减少副作用，组件尽量的简单一些），这样重新渲染的压力也会小一些。

## useRef
某些用来做标志位的值存在ref中就够了，完全不需要使用state。如果用了state，引发重新渲染不说，依赖这个标志位的callback如果使用useCallback优化了，那好像也没啥用，反正标志位一变就会重新生成个函数对象。以及一个作为标志位的state，如果在useEffect里面用到，那它写进useEffect的依赖中可能没什么必要，不写的话又违反hooks的使用规范，就挺尴尬的。


# 结尾
大概就是这么多，拖了很久才决定写这么一个小总结（要不然过一阵子就更想不起来了）。顺带再简单介绍下MusicFree，这是个基于React Native开发的开源音乐播放器，可以通过写一个简单的js脚本来扩展音源，简单的介绍可以看github。

本文中的所有代码也都在github上可以看到：[可以戳这里](https://github.com/maotoumao/MusicFree/blob/master/src/components/base/SortableFlatList.tsx)；这个项目尽管说有些地方写的还是不好，但是感觉还是比较适合初学者的，拿来练手也不错。

如果你喜欢我的内容，也可以关注下公众号【一只猫头猫】，平时工作之余的一些想法以及做的一些其他的有趣的事情也会分享在公众号。应该不太会为了维持关注发水文，尽量发一些有意义的东西。感兴趣就随缘关注下吧~~~ 过一段时间*说不准*会更新个刷题系列，可以一起鸭~


