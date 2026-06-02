---
title: "数字图像处理（Digital Image Processing）完全学习手册"
published: 2026-06-03
description: "《数字图像处理》学习总览与学习路线"
tags: [Study Notes, Digital Image Processing]
category: "Digital Image Processing"
draft: false
pinned: false
comment: true
---

# 数字图像处理（Digital Image Processing）完全学习手册

> 面向计算机视觉、图像工程、模式识别方向的系统化学习资料。
> 内容覆盖冈萨雷斯《Digital Image Processing (4th Edition)》经典脉络，并扩展至现代深度学习在图像处理中的应用。
> 全部配套 Python（NumPy + OpenCV + scikit-image + Matplotlib）项目实践。

---

## 目录结构

```
数字图像处理/
├── README.md                    # 本文件：课程总览与学习路线
├── chapters/                    # 理论知识（12 章）
│   ├── 01_绪论与数字图像基础.md
│   ├── 02_图像数字化_采样与量化.md
│   ├── 03_空间域图像增强.md
│   ├── 04_频率域图像处理.md
│   ├── 05_图像复原与重建.md
│   ├── 06_彩色图像处理.md
│   ├── 07_小波变换与多分辨率分析.md
│   ├── 08_图像压缩.md
│   ├── 09_形态学图像处理.md
│   ├── 10_图像分割.md
│   ├── 11_特征提取与表示.md
│   └── 12_图像识别与深度学习.md
├── projects/                    # 项目实践（10 个）
│   ├── 01_basic_and_histogram/
│   ├── 02_spatial_filtering/
│   ├── 03_frequency_filtering/
│   ├── 04_edge_and_hough/
│   ├── 05_morphology/
│   ├── 06_segmentation/
│   ├── 07_feature_matching_panorama/
│   ├── 08_license_plate_recognition/
│   ├── 09_face_detection/
│   ├── 10_cnn_classification/
│   ├── README.md                # 项目总览
│   └── requirements.txt         # 依赖
└── assets/                      # 示例图片与结果
```

---

## 学习路线图

```
                ┌────────────────────────┐
                │  阶段 0：数学与编程基础 │
                │  线性代数 / 概率 / Python│
                └───────────┬────────────┘
                            ▼
        ┌───────────────────────────────────────┐
        │  阶段 1：基础理论 (Ch 1~2)             │
        │  图像模型、采样、量化、像素关系         │
        └───────────┬───────────────────────────┘
                    ▼
        ┌───────────────────────────────────────┐
        │  阶段 2：图像增强 (Ch 3~4)             │
        │  空间域滤波 + 频率域滤波                │
        │  ▶ 项目 01、02、03                     │
        └───────────┬───────────────────────────┘
                    ▼
        ┌───────────────────────────────────────┐
        │  阶段 3：图像复原与压缩 (Ch 5、8)      │
        │  噪声建模、维纳滤波、JPEG               │
        └───────────┬───────────────────────────┘
                    ▼
        ┌───────────────────────────────────────┐
        │  阶段 4：彩色与小波 (Ch 6、7)          │
        │  HSV、Lab、小波分解                    │
        └───────────┬───────────────────────────┘
                    ▼
        ┌───────────────────────────────────────┐
        │  阶段 5：形态学、分割 (Ch 9、10)       │
        │  阈值、边缘、区域、分水岭               │
        │  ▶ 项目 04、05、06                     │
        └───────────┬───────────────────────────┘
                    ▼
        ┌───────────────────────────────────────┐
        │  阶段 6：特征与识别 (Ch 11、12)        │
        │  SIFT/ORB、CNN、迁移学习               │
        │  ▶ 项目 07、08、09、10                 │
        └───────────────────────────────────────┘
```

---

## 推荐学习顺序

| 周次 | 阅读章节 | 配套项目 | 目标 |
|------|----------|----------|------|
| 第 1 周 | Ch 01、02 | — | 掌握图像表示、采样定理 |
| 第 2 周 | Ch 03 | 项目 01、02 | 空间域增强与滤波 |
| 第 3 周 | Ch 04 | 项目 03 | 频域分析与滤波 |
| 第 4 周 | Ch 05、08 | — | 复原与压缩原理 |
| 第 5 周 | Ch 06、07 | — | 彩色空间 + 小波 |
| 第 6 周 | Ch 09、10 | 项目 04、05、06 | 形态学与分割 |
| 第 7 周 | Ch 11 | 项目 07 | 特征点匹配 |
| 第 8 周 | Ch 12 | 项目 08、09、10 | 综合应用 + 深度学习 |

---

## 先修知识

1. **线性代数**：矩阵运算、特征值分解、SVD
2. **微积分**：偏导数、梯度、卷积、积分变换
3. **概率论**：随机变量、条件概率、贝叶斯、高斯分布
4. **信号与系统**：线性时不变系统、卷积、傅里叶变换
5. **Python**：NumPy 向量化、Matplotlib 可视化
6. **OpenCV**：基本 API（`cv2.imread` / `cv2.imshow` / `cv2.filter2D` 等）

---

## 参考教材

- **[主]** Rafael C. Gonzalez, Richard E. Woods. *Digital Image Processing (4th Ed.)*, 2018.
- **[辅]** Richard Szeliski. *Computer Vision: Algorithms and Applications (2nd Ed.)*, 2022.
- **[实战]** Adrian Rosebrock. *Practical Python and OpenCV*.
- **[深度学习]** Ian Goodfellow. *Deep Learning*, 2016.
- **[中文]** 阮秋琦《数字图像处理》（电子工业出版社）。

## 在线资源

- OpenCV 官方教程：<https://docs.opencv.org/>
- scikit-image 示例：<https://scikit-image.org/docs/stable/auto_examples/>
- Stanford CS231n：<https://cs231n.stanford.edu/>
- Papers with Code（图像任务）：<https://paperswithcode.com/area/computer-vision>

---

## 使用说明

1. 按章节顺序阅读 `chapters/` 下的 Markdown 文件；每章末尾包含公式推导、算法流程与面试高频考点。
2. 阅读对应章节后，进入 `projects/` 下的子目录，运行 `main.py`。
3. 所有项目共享一份依赖：

```bash
cd projects
python -m venv .venv && source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

4. 将自己的测试图片放在 `assets/` 下，或使用 `skimage.data` 内置样图。

祝学习愉快！🎓
