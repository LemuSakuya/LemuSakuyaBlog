---
title: "单片机开发（MCU Development）学习手册"
published: 2026-06-03
description: "《单片机开发》学习总览与学习路线"
tags: [Study Notes, MCU Development]
category: "MCU Development"
draft: false
pinned: false
comment: true
---

# 单片机开发（MCU Development）学习手册

> 面向 51 单片机入门与课程实验的系统化资料。
> 学习路径以 C51 + Keil + Proteus 为主，逐步过渡到 STM32 开发思维。

---

## 目录结构

```text
单片机开发/
├── README.md
├── chapters/
│   ├── 01_单片机概述与开发环境.md
│   ├── 02_C51语言与寄存器基础.md
│   ├── 03_GPIO_按键_LED.md
│   ├── 04_定时器与中断.md
│   ├── 05_数码管与矩阵键盘.md
│   ├── 06_串口通信_UART.md
│   ├── 07_I2C_SPI_与常见外设.md
│   └── 08_综合实验与调试方法.md
└── projects/
    ├── README.md
    ├── 01_key_led_flow/
    │   ├── README.md
    │   └── main.c
    ├── 02_timer_interrupt_counter/
    │   ├── README.md
    │   └── main.c
    └── 03_seven_segment_display/
        ├── README.md
        ├── main.c
        └── notes_for_report.md
```

---

## 学习路线（建议 4~6 周）

1. 第 1 周：环境搭建 + C51 基础 + GPIO
2. 第 2 周：按键消抖 + 流水灯 + 状态机
3. 第 3 周：定时器 + 中断 + 数码管
4. 第 4 周：串口通信 + 综合实验
5. 进阶：迁移到 STM32（时钟树、HAL、RTOS）

---

## 开发环境

- 编译器与 IDE：Keil uVision5（C51）
- 仿真：Proteus 8
- 芯片建议：AT89C51 / STC89C52
- 基础元件：LED、按键、电阻网络、晶振、复位电路

---

## 学习目标

1. 独立完成 51 单片机课程实验（按键、LED、定时器、中断、串口）
2. 能读懂并编写结构清晰的嵌入式 C 代码
3. 掌握常见调试方法（示波器思维、串口打印、分模块定位）
4. 能将 51 代码思路迁移到 STM32 工程

---

## 使用方法

1. 先阅读 chapters 中对应章节。
2. 再按 projects 目录完成实验。
3. 每做完一个实验，建议保留以下材料：
   - 工程源码（.c/.h）
   - Proteus 仿真工程（.dsn）
   - 实验报告截图（原理图 + 运行效果）

祝你实验顺利，期末一次过。
