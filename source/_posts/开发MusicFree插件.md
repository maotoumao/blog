---
title: 开发MusicFree插件
date: 2022-09-15 22:34:45
categories:
 - 前端
 - 安卓
tags:
 - js
 - 语法
description: 前阵子开发了个听音乐的软件Music Free，这里简单记录一下给软件开发插件的步骤。
---
# MusicFree插件是什么
MusicFree是一个插件化的音乐播放器。它本身不包含任何音乐源，所有的功能都是通过插件的形式导入的。插件本质上是一个javascript函数，通过实现符合插件协议的javascript函数，即可完成特定音源的播放，这也就意味着只要能搜得到的音乐，那么就都可以播放。

# 插件的标准协议
一个MusicFree插件的结构如下:

``` javascript
    // packages里面预置了一些常用的包，包括axios，dayjs，cryptojs和cheerio，应该够用了
    function pluginName(packages){
        // 在这里可以编写一些逻辑，存储全局变量之类的;
        return {
            platform: '插件名称', // [必选] 插件名，这个名字没取好，于是将错就错了
            cacheControl: 'no-cache', // [可选] 插件的缓存控制方案，用来缓存插件信息
            version: '0.0.0', // [可选] 插件版本号
            primaryKey: ['id'], // [可选] 主键名，可在此字段中填写插件函数入参中必备的字段
            appVersion: '>0.0', // [可选] 兼容此插件的app版本号，预防后续协议更新出现不兼容格式时报错的情况。
            defaultSearchType: 'music', // [可选] 插件在搜索时，首屏默认请求的搜索类型。
            /** 搜索 */
            search: function(query, page, type) { // 三个参数分别为: 查询的keyword，当前页码，搜索类型
                if(type === 'music') {
                    // 网络请求
                    return {
                        isEnd: true, // 分页请求是否结束
                        data: [], // MusicItem类型的列表
                    }
                }
                if(type === 'album') {
                    // 网络请求
                    return {
                        isEnd: true, // 分页请求是否结束
                        data: [], // AlbumItem类型的列表
                    }
                }
                if(type === 'artist') {
                    // 网络请求
                    return {
                        isEnd: true, // 分页请求是否结束
                        data: [], // ArtistItem类型的列表
                    }
                }
            },
            /** 获取真实的播放源 */
            getMediaSource: function (musicItem) { // 入参：搜索结果中MusicItem类型的音乐
                return {
                    headers: undefined, // [可选] headers
                    url: 'https://', // 真实url,
                    userAgent: undefined, // [可选] 如果不填，会取headers的user-agent字段
                    
                }
            },
            /** 根据mediaBase信息（包括primaryKey） 获取歌曲的详细信息 [!!此函数暂时用不到 ] */
            getMusicInfo: function (mediaBase) {
                return musicItem;
            },
            /** 获取歌词 */
            getLyric: function (musicItem){

                return {
                    lrc: 'http:///', //歌词源,
                    rawLrc: '[00:00.000]这是一句歌词', //纯文本的歌词
                }
            },
            /** 获取专辑详细信息 */
            getAlbumInfo: function (albumItem) {

                return {
                    ...albumItem,
                    musicList: []
                }
            },
            /** 查询作者的详细信息 */
            queryArtistWorks: function (artistItem, page, type) {
                if(type === 'music') {
                    // 网络请求
                    return {
                        isEnd: false,
                        data: [], // MusicItem类型音乐列表
                    }
                } 
                if(type === 'album') {
                    // 网络请求
                    return {
                        isEnd: false,
                        data: [], // AlbumItem类型音乐列表
                    }
                }
            },
            /** 导入单曲 */
            importMusicItem: function (urlLike) {
                return musicItem;
            },
            /** 导入歌单 */
            importMusicSheet: function (urlLike) {
                const musicItems = [];
                return musicItems;
            }



        }
    }
```
目前插件中的所有常量/函数如上，只有platform是必选参数，其他均为可选。

插件中定义了四种基本的媒体类型，分别是:

- 基础媒体类型：platform和id标识着唯一的一个媒体
``` typescript 
    type IMediaBase = {
        id: string;
        platform: string;
        $?: any; // 内部变量，不要给它赋值，会被覆盖
        [k: symbol]: any;
        [k: string]: any;
    };
```

- 音乐类型
``` typescript
    interface IMusicItemBase extends ICommon.IMediaBase {
        /** 其他属性 */
        [k: keyof IMusicItem]: IMusicItem[k];
    }
    interface IMusicItem {
        /** 歌曲在平台的唯一编号 */
        id: string;
        /** 平台 */
        platform: string;
        /** 作者 */
        artist: string;
        /** 标题 */
        title: string;
        /** 时长(s) */
        duration: number;
        /** 专辑名 */
        album: string;
        /** 专辑封面图 */
        artwork: string;
        /** 音源 */
        url?: string;
        /** 歌词URL */
        lrc?: string;
        /** 歌词 */
        rawLrc?: string;
        /** 其他可以被序列化的信息 */
        [k: string]: any;
        /** 内部信息 */
        [k: symbol]: any;
    }
```

- 作者类型
``` typescript
    interface IArtistItemBase extends ICommon.IMediaBase {
        name: string;
        id: string;
        fans?: number;
        description?: string;
        platform: string;
        avatar: string;
        worksNum: number;
    }

    interface IArtistItem extends IArtistItemBase {
        musicList: IMusic.IMusicItemBase;
        albumList: IAlbum.IAlbumItemBase;
        [k: string]: any;
    }
```

- 专辑类型
``` typescript
    interface IAlbumItemBase extends ICommon.IMediaBase {
        artwork: string;
        title: string;
        date: string;
        artist: string;
        description?: string;
    }
    interface IAlbumItem extends IAlbumItemBase {
        musicList: IMusic.IMusicItem[];
    }
```

通过编写以上简单的脚本，并通过musicfree的插件导入，就可以使用插件完成对应的音乐行为了。
