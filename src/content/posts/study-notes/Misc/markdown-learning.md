---
title: "markdown learning"
published: 2026-06-03
description: "《杂记》学习笔记：markdown learning"
tags: [Study Notes, Misc]
category: "Misc"
draft: false
pinned: false
comment: true
---

# <font face="仿宋" font color=orange>Markdown 入门教程</font>
## <center><font face="" size = 5> LemuSakuya</font></center>
### 一、准备工作
    跳过
### 二、基本语法
1. **标题**
    #一级标题
    ##二级标题
    ###三级标题
    ...
2. **引用**
    > 引用案例
    >> 二级引用
3. **列表**
    1. 无序列表
    - 列表1
    + 列表2
    * 列表3
    2. 有序列表
    3. 嵌套
    4. TodoList
        - [ ] a
        - [ ] b
        - [ ] c
4. **表格**
    | 左对齐 | 居中对齐 | 右对齐 |
    | :- | :-: | -: |
    | a | b | c |
5. **段落**
   - 推荐使用隔一行的换行方式
   - 分割线三个*
    ***
   - 字体  

    | 字体 | 代码 |
    | :--: | :--: |
    | *斜体* | * * |
    | ==高亮== | == == |
    | **粗体** | ** ** |
    | ***斜粗体*** | *** *** |
    | ~~删除~~ | ~~ ~~ |
    | <u>下划线</u> | ` <u> </u> ` |
   - 脚注
    初音未来[^1] 天下第一
6. **代码**
   ```
   #include<bits/stdc++.h>
   using namespace std;

   int main()
   {
        cout << "1145141919810" << endl;

        return 0;
   }
    ```
    或者
    ` #include <bits/stdc++.h> `
7. **超链接**
   - [谢谢关注Github喵~]: 

        https://github.com/LemuSakuya
        或者
   - [Thank you for your subscribtion][链接]
        (要放在注释前面)
8. **图片**
    ![LemuSakuya](/assets/home/LemuSakuyaAvatar.webp)
9. **Latex**
    - 行内显示数学公式
    $f(x)=ax+b$
    - 块内显示数学表达式
    $$
    \begin{Bmatrix}
    a & b \\
    c & d
    \end{Bmatrix}
    $$

    [链接]: https://github.com/LemuSakuya
    [^1]: 就是公主殿下啊喵？