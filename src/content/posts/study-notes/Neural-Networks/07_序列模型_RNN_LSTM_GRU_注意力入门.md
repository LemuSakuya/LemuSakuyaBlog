---
title: "序列模型 RNN LSTM GRU 注意力入门"
published: 2026-06-03
description: "《神经网络》学习笔记：07 序列模型 RNN LSTM GRU 注意力入门"
tags: [Study Notes, Neural Networks]
category: "Neural Networks"
draft: false
pinned: false
comment: true
---

# 第 7 章 序列模型、RNN、LSTM、GRU 与注意力入门

## 7.1 学习目标

1. 理解序列数据的建模方式与静态表格数据的区别。
2. 掌握 RNN 的基本思想、展开方式和训练难点。
3. 理解 LSTM 与 GRU 如何缓解长依赖和梯度问题。
4. 认识注意力机制的基本作用，并理解它为什么能提升序列建模能力。
5. 能完成一个简单的文本分类或时间序列实验。

**能力矩阵**：

| 能力域 | 入门 | 进阶 | 熟练 |
|--------|------|------|------|
| 序列理解 | 知道顺序信息 | 理解隐藏状态 | 能比较 RNN / LSTM / GRU |
| 注意力 | 知道会“关注” | 理解权重分配 | 能写简化注意力模块 |
| 任务实践 | 能做文本分类 | 能做时序预测 | 能分析长依赖问题 |

---

## 7.2 序列数据是什么

序列数据的关键特征是“顺序重要”。例如：

- 句子中的词序
- 语音帧序列
- 时间序列传感器数据
- 视频帧序列

与图像不同，序列任务需要模型记住过去的信息。

---

## 7.3 RNN

### 7.3.1 基本思想

RNN 的核心是让隐藏状态在时间步之间传递：

$$
h_t = \phi(W_x x_t + W_h h_{t-1} + b)
$$

### 7.3.2 直觉

- 当前时刻的输出不仅看当前输入，还看历史记忆；
- 隐藏状态相当于压缩后的“上下文摘要”。

### 7.3.3 展开

RNN 可以沿时间展开成一条很长的计算图，因此训练时会遇到长链式求导问题。

---

## 7.4 RNN 的问题

### 7.4.1 长期依赖难学

当序列很长时，梯度在多次相乘后容易消失或爆炸。

### 7.4.2 信息瓶颈

隐藏状态维度固定，长序列中的信息会被不断压缩，部分细节可能丢失。

---

## 7.5 LSTM

### 7.5.1 核心思想

LSTM 通过门控机制控制信息的写入、保留和输出。

### 7.5.2 三个门

- 输入门：决定写入多少新信息
- 遗忘门：决定保留多少旧记忆
- 输出门：决定输出多少当前状态

### 7.5.3 优势

LSTM 更适合长序列和长依赖任务，因为它有更好的记忆通道。

---

## 7.6 GRU

### 7.6.1 核心思想

GRU 是比 LSTM 更简洁的门控循环单元。

### 7.6.2 优势

- 参数更少
- 训练更快
- 在一些任务上效果接近 LSTM

### 7.6.3 适用场景

当数据量不大或工程上需要较轻结构时，GRU 常是不错的选择。

---

## 7.7 注意力机制入门

### 7.7.1 为什么需要注意力

单个固定长度隐藏状态很难承载全部历史信息，注意力机制允许模型在不同位置之间动态分配权重。

### 7.7.2 直觉

模型不必平均看待每个词，而是可以“更关注”对当前任务更重要的部分。

### 7.7.3 简化公式

$$
\alpha_i = \text{softmax}(score(q, k_i))
$$

$$
\text{context} = \sum_i \alpha_i v_i
$$

其中：

- $q$ 是查询
- $k_i$ 是键
- $v_i$ 是值
- $\alpha_i$ 是注意力权重

---

## 7.8 Attention 与 Transformer 的关系

注意力机制本身不是 Transformer，但 Transformer 的核心就是多头自注意力。你可以先把注意力理解成“动态加权汇聚”，再逐步进入 Transformer。

---

## 7.9 常见序列任务

1. 情感分析
2. 文本分类
3. 机器翻译
4. 语音识别
5. 时间序列预测
6. 异常检测

---

## 7.10 PyTorch 示例轮廓

```python
import torch
import torch.nn as nn

class TextRNN(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, num_classes):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.rnn = nn.GRU(embed_dim, hidden_dim, batch_first=True)
        self.classifier = nn.Linear(hidden_dim, num_classes)

    def forward(self, x):
        x = self.embedding(x)
        out, h = self.rnn(x)
        return self.classifier(h[-1])
```

---

## 7.11 训练注意事项

- 序列长度要统一处理：padding、mask。
- 长文本可能需要截断。
- 词表太大时要考虑 embedding 维度。
- 训练时要特别关注梯度稳定性。
- 如果序列太长，可以考虑注意力、卷积或 Transformer。

---

## 7.12 常见误区

1. 以为 RNN 一定比 MLP 更强。实际上取决于任务结构。
2. 以为长序列只要堆更多层就行。实际上可能更难训练。
3. 以为 LSTM 和 GRU 只是名字不同。实际上门控结构不同。
4. 以为注意力只是“加权平均”。实际上它是可学习的对齐机制。

---

## 7.13 本章小结

序列模型的关键是如何表达“顺序”和“记忆”。RNN 给出了基础框架，LSTM / GRU 解决了训练困难，而注意力机制进一步提升了模型对重要信息的选择能力。

---

## 7.14 课后练习

1. 写出 RNN 的隐藏状态递推公式并解释各项含义。
2. 说明为什么 RNN 容易出现梯度消失。
3. 比较 LSTM 和 GRU 的区别。
4. 用自己的话解释注意力机制在做什么。
5. 选一个文本分类任务，设计一个简单的 RNN 实验。

---

## 7.15 反向传播通过时间（BPTT）详解

RNN 的训练通常使用反向传播通过时间（Backpropagation Through Time, BPTT）。把 RNN 在时间维度展开后，BPTT 相当于对这个展开的计算图进行常规反向传播。

假设单层 RNN 的递推为：

$$
h_t = \phi(W_x x_t + W_h h_{t-1} + b)
$$

损失关于参数 $W_h$ 的梯度可以写为时间步求和：

$$
\frac{\partial L}{\partial W_h} = \sum_{t=1}^T \delta_t h_{t-1}^T
$$

其中 $\delta_t$ 表示时间步 $t$ 的上游误差对线性变换输出的梯度，满足递归关系：

$$
\delta_t = (W_h^T \delta_{t+1}) \odot \phi'(z_t) + \frac{\partial L_t}{\partial z_t}
$$

因此梯度通过时间逐步传回，若 $\|W_h\|$ 小于 1，多次乘积会导致梯度消失；若大于 1，会导致梯度爆炸。

实践要点：

- 在训练 RNN 时启用梯度裁剪；
- 使用门控单元（LSTM/GRU）缓解长期依赖问题；
- 对长序列使用截断 BPTT（truncated BPTT）以降低计算成本。

---

## 7.16 LSTM 详细推导与门控解析

一个标准 LSTM 单元的计算（按时间步 t）为：

$$
\begin{aligned}
i_t = \sigma(W_{xi} x_t + W_{hi} h_{t-1} + b_i)\\
f_t = \sigma(W_{xf} x_t + W_{hf} h_{t-1} + b_f)\\
o_t = \sigma(W_{xo} x_t + W_{ho} h_{t-1} + b_o)\\
\tilde{c}_t = \tanh(W_{xg} x_t + W_{hg} h_{t-1} + b_g)\\
c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t\\
h_t = o_t \odot \tanh(c_t)
\end{aligned}
$$

解释：

- 遗忘门 $f_t$ 决定保留多少先前记忆 $c_{t-1}$；
- 输入门 $i_t$ 决定当前候选信息 $\tilde{c}_t$ 写进细胞状态的多少；
- 输出门 $o_t$ 决定从细胞状态输出多少作为隐藏状态；
- 细胞状态 $c_t$ 提供了更直接的梯度流动路径，从而缓解消失梯度。

反向传播中需要对每个门的梯度做链式法则展开，工程实现中要注意中间量的缓存（$i_t, f_t, o_t, \tilde{c}_t, c_t$）。

---

## 7.17 GRU 的数学形式与比较

GRU 的更新较为简洁，常见形式为：

$$
\begin{aligned}
z_t = \sigma(W_{xz} x_t + W_{hz} h_{t-1})\\
r_t = \sigma(W_{xr} x_t + W_{hr} h_{t-1})\\
\tilde{h}_t = \tanh(W_{xh} x_t + W_{hh} (r_t \odot h_{t-1}))\\
h_t = (1 - z_t) \odot h_{t-1} + z_t \odot \tilde{h}_t
\end{aligned}
$$

其中 $z_t$ 是更新门，$r_t$ 是重置门。GRU 把 LSTM 的某些门合并，参数更少且结构更简单。

实用对比：

- LSTM 在某些语言建模任务上表现更好；
- GRU 更轻量、训练更快；
- 两者的实际差距取决于任务与超参设置。

---

## 7.18 位置编码与 Transformer 简介

Transformer 使用自注意力替代循环结构，关键在于它能并行计算并直接建模全序列的任意位置之间的依赖。

基本自注意力（Scaled Dot-Product Attention）定义为：

$$
	ext{Attention}(Q,K,V)=\text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

Transformer 的核心组件：

- 多头注意力（Multi-Head Attention）：并行多个注意力头以捕捉不同子空间的依赖；
- 前馈网络（位置无关的逐位置 MLP）；
- 残差连接与 LayerNorm 保证训练稳定。

位置编码用于把序列的位置信息注入 Transformer，常见的正弦/余弦位置编码为：

$$
\begin{aligned}
PE_{(pos,2i)} = \sin(pos/10000^{2i/d_{model}})\\
PE_{(pos,2i+1)} = \cos(pos/10000^{2i/d_{model}})
\end{aligned}
$$

---

## 7.19 多头注意力的实现要点

设输入 $X\in\mathbb{R}^{T\times d_{model}}$，多头注意力将其映射为多个头：

$$
Q = XW^Q,\quad K = XW^K,\quad V = XW^V
$$

将 $Q,K,V$ 划分为 $h$ 个头，每个头维度为 $d_k=d_{model}/h$，并并行计算注意力，最后拼接并线性投影回 $d_{model}$。

实现细节：

- 注意数值稳定性（缩放因子 $\sqrt{d_k}$）；
- 掩码（mask）用于解码器的自回归任务以防止“看到未来”；
- 多头并行计算要注意维度变换的实现效率。

---

## 7.20 Transformer 的训练建议

1. 学习率调度：常用带 warmup 的学习率调度（例如 Adam + 线性 warmup + 反向平方根衰减）。
2. 批量大小：Transformer 常受益于更大的 batch（并行化优势）。
3. 标签平滑能提高泛化性和训练稳定性。 
4. 对于生成任务，使用 beam search 做推理而非贪心策略可提升质量。

---

## 7.21 序列学习的工程实践要点

1. 统一序列长度：padding 和 mask 的正确使用至关重要。 
2. 字典与 OOV 处理：词表、子词（BPE/WordPiece）或字符级模型。 
3. Embedding 初始化：可以用预训练 embedding（GloVe, FastText）或随机初始化。 
4. Batch 的构建：对可变长序列使用按长度排序+打包（pack_padded_sequence）以提升效率。 
5. 训练时监控 perplexity（语言模型）或 F1/AUC（分类）等更适合任务的指标。 

---

## 7.22 实战代码：简化的多头注意力（PyTorch）

```python
import torch
import torch.nn as nn

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        assert d_model % num_heads == 0
        self.d_k = d_model // num_heads
        self.h = num_heads
        self.wq = nn.Linear(d_model, d_model)
        self.wk = nn.Linear(d_model, d_model)
        self.wv = nn.Linear(d_model, d_model)
        self.fc = nn.Linear(d_model, d_model)

    def forward(self, x, mask=None):
        N, T, D = x.size()
        Q = self.wq(x).view(N, T, self.h, self.d_k).transpose(1,2)
        K = self.wk(x).view(N, T, self.h, self.d_k).transpose(1,2)
        V = self.wv(x).view(N, T, self.h, self.d_k).transpose(1,2)

        scores = (Q @ K.transpose(-2,-1)) / (self.d_k ** 0.5)
        if mask is not None:
            scores = scores.masked_fill(mask==0, -1e9)
        attn = torch.softmax(scores, dim=-1)
        out = (attn @ V).transpose(1,2).contiguous().view(N,T,D)
        return self.fc(out)
```

---

## 7.23 章节级实践项目（文本）

项目：情感分析微调与可解释性

- 数据集：IMDB 或 SST-2；
- 模型：基于预训练 Transformer 微调；
- 要点：实现数据预处理、微调流程、评估、Grad-CAM/注意力可视化并写实验报告；
- 拓展：比较 RNN 与 Transformer 微调的效果和效率。

---

## 7.24 本章小结（扩展）

本章把序列建模从 RNN 的基本想法扩展到门控结构与注意力机制，进而介绍 Transformer 的核心组件与训练实务。掌握这些内容能让你在 NLP、语音与时序预测等领域快速上手并做出可复现的实验。

---

## 7.25 参考资料与延伸阅读

- Hochreiter & Schmidhuber — LSTM 原始论文
- Cho et al. — GRU 介绍论文
- Vaswani et al. — Attention is All You Need（Transformer）
- 最佳实践示例：Hugging Face 文档与 Transformer 教程

---

## 7.26 序列到序列（Seq2Seq）模型与编码器-解码器架构

Seq2Seq 架构由编码器（encoder）把源序列压缩成上下文表示，由解码器（decoder）逐步生成目标序列。经典做法是用带注意力的编码器-解码器：

1. 编码器把源序列映射为隐藏序列 $\{h_1^e, ..., h_T^e\}$；
2. 解码器在每步根据上一步隐藏状态与注意力加权的上下文生成下一个 token；
3. 注意力让解码器在生成时“看”源序列的不同位置。

训练通常采用教师强制（teacher forcing）：在训练时把真实上一步输出作为解码器的输入，而不是模型上一步的预测。

缺点：教师强制会导致暴露偏差（exposure bias），生成时模型没有见过自己的历史错误，解决方法包括 scheduled sampling 等。

---

## 7.27 解码策略：贪心、束搜索与采样

常见解码策略：

- 贪心（Greedy）：每步选概率最高的 token。速度快但可能非全局最优。 
- Beam Search（束搜索）：保持 top-k 候选序列并扩展，常用于机器翻译与生成任务以找到更优序列。 
- 采样（Sampling）：按概率分布采样 token，可用在生成多样化文本（可调温度）。

Beam Search 实现要注意长度归一化和重复惩罚（重复 n-gram 的惩罚）。

---

## 7.28 训练技巧与稳定化方法（序列）

1. 梯度裁剪：防止梯度爆炸；
2. 标签平滑：提高泛化；
3. 残差与 LayerNorm：帮助深层 Transformer；
4. Warmup 学习率策略：避免初期不稳定；
5. 使用混合精度以节省显存并提升吞吐量；
6. 定期保存并评估多个验证指标（perplexity, BLEU, ROUGE）。

---

## 7.29 Masking 技术详解

在序列处理中常用两类掩码（mask）：

- Padding mask：遮挡填充位置，避免模型把填充位置视为有效信息；
- Causal mask（自回归掩码）：用于解码器防止看到未来位置，保证自回归生成的因果性。

在实现多头注意力时，这两类掩码通常按广播规则合并并应用在 attention logits 上。

---

## 7.30 评估指标与自动化测试

语言生成与翻译常用指标：

- Perplexity：语言模型的平均不确定度，越低越好；
- BLEU：机器翻译质量的自动指标；
- ROUGE：摘要任务的常用指标；
- METEOR、CIDEr 等其他专用指标。

自动化测试包括：端到端训练复现性、生成质量基线、解码器输出格式与稳定性测试。

---

## 7.31 数值示例：截断 BPTT 与效率权衡

截断 BPTT（Truncated BPTT）在多步序列训练中只回传固定时间窗口的梯度，以减少内存和计算量。

策略示例：在长度为 1000 的序列上每隔 20 步进行一次反向传播，同时保存隐状态的 detached 版本继续前向，既能捕捉中短期依赖，又能保持计算效率。

实现注意点：在 PyTorch 中使用 `detach()` 来切断计算图以实现截断 BPTT。

---

## 7.32 进阶阅读与研究方向

1. Transformer 的长序列处理：Sparse Attention、Performer、Linformer 等；
2. 蒸馏与小模型微调：DistilBERT、TinyBERT；
3. 自监督学习：BERT 的遮蔽语言建模（MLM）、GPT 的自回归建模；
4. 多模态序列模型：视觉-语言模型（CLIP、BLIP）、视频理解中的时间建模技巧。

---

## 7.33 扩展练习（进阶）

1. 实现简单的 Seq2Seq 模型（带注意力）并在小数据集上训练；
2. 实验 scheduled sampling 对生成质量的影响；
3. 用 beam search 实现一个翻译解码器并比较不同 beam size 的结果与速度；
4. 实现一个 mask 合并模块并在 attention 中测试其效果；
5. 用 Transformer 在小语料上训练一个简化版的语言模型，输出 perplexity 曲线并分析收敛行为。

---

## 7.34 字符级语言建模示例（简化）

字符级语言模型以字符为基本单位，适合教学与小数据实验。下面给出训练循环要点：

1. 构建字符表（vocab）与映射；
2. 把文本切成固定长度的序列（例如 100），并构造输入/标签对（下一个字符预测）；
3. 使用小型 RNN/LSTM 进行训练并记录 perplexity；
4. 使用温度采样或 beam search 生成文本示例。 

NumPy/PyTorch 教学实现会放在项目目录供实践。

---

## 7.35 数据管线（序列）设计要点

1. Tokenization：选择合适的粒度（字符/词/子词）；
2. Padding 与 Mask：统一 batch 形状并保证掩码正确；
3. Batch 采样策略：按长度排序或 bucketing 以减少 padding；
4. 数据增强：对于语音和时序，可使用时间掩码、随机裁剪等方法；
5. 数据验证：确保训练/验证/测试的分布一致并记录元数据。 

---

## 7.36 模型微调与迁移学习（序列）

微调流程：

1. 选用预训练模型（如 BERT、GPT）；
2. 根据任务定义输出头（classification/regression/seq2seq）；
3. 可能先冻结底层若干层只训练顶部；
4. 设置较小的学习率并使用 AdamW；
5. 记录验证指标并逐步解冻层以微调更深层次特征。

实用技巧：预训练模型参数多，微调时要注意 batch size、显存与学习率的平衡。结合混合精度训练可以节省显存。

---

## 7.37 典型错误与调试技巧（序列）

1. 预测重复（mode collapse）：在生成任务中，模型可能反复生成相同短片段，解决方法包括 nucleus sampling、温度调节与重复惩罚；
2. 数据泄漏：确保没有把未来信息用于训练；
3. 掩码错误：错误的掩码会让模型看到 padding 或未来信息；
4. 长序列 OOM：使用分块/滑动窗口或长序列专用模型（Longformer、Reformer）；
5. 解码时无限循环：在生成模型中设置最大长度并检测循环重复。 

---

## 7.38 章节总结与后续任务清单

接下来的工作清单（建议）：

- 在项目目录实现字符级语言模型并完成训练（看 `projects/04_sequence_text_classification/`）；
- 实现一个小型 Seq2Seq 与 beam search 解码器；
- 用 Transformer 微调一个文本分类任务并与 RNN 比较性能与速度。

完成这些将为你在序列任务中打下扎实的工程能力。



