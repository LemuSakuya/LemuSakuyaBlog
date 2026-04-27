---
title: "I2C、SPI与常见外设"
published: 2026-04-27
description: "《单片机开发》学习笔记：I2C_SPI_与常见外设"
tags: [学习笔记, 单片机开发]
category: "单片机开发"
draft: false
pinned: false
comment: true
---

# 07 I2C、SPI 与常见外设

## 1. I2C 特点

- 两线制（SCL/SDA）
- 支持多主多从
- 常见设备：EEPROM、温湿度传感器、OLED

## 2. SPI 特点

- 全双工，速度高
- 常见信号：SCK、MOSI、MISO、CS
- 常见设备：Flash、ADC、屏幕模块

## 3. 典型外设驱动流程

1. 阅读数据手册，确认寄存器地址
2. 初始化总线
3. 封装读写函数
4. 按时序读写并校验

## 4. 学习建议

先从 I2C 读温度传感器开始，再做 SPI 驱动 OLED 显示。
