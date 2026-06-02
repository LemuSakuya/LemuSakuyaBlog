---
title: "网络安全（Cybersecurity）完全学习手册"
published: 2026-06-03
description: "《网络安全》学习总览与学习路线"
tags: [Study Notes, Cybersecurity]
category: "Cybersecurity"
draft: false
pinned: false
comment: true
---

# 网络安全（Cybersecurity）完全学习手册

> 面向安全工程师、红队 / 蓝队、CTF 选手、安全研究员方向的系统化学习资料。
> 内容覆盖从计算机网络、操作系统、密码学基础，到 Web 渗透、二进制安全、恶意代码分析、蓝队防御与云原生安全的全栈知识体系。
> 全部配套可在本地复现的实验环境（Kali Linux / Docker / VirtualBox）与 Python 工具链。

---

## 目录结构

```
网络安全/
├── README.md                                # 本文件：课程总览与学习路线
├── chapters/                                # 理论知识（12 章）
│   ├── 01_网络安全绪论与学习路径.md
│   ├── 02_网络基础与协议安全.md
│   ├── 03_操作系统安全_Linux与Windows.md
│   ├── 04_密码学基础与应用.md
│   ├── 05_Web应用安全_OWASP_Top10.md
│   ├── 06_信息收集与OSINT.md
│   ├── 07_漏洞评估与扫描.md
│   ├── 08_渗透测试方法论.md
│   ├── 09_二进制安全与逆向工程.md
│   ├── 10_恶意代码分析与数字取证.md
│   ├── 11_蓝队防御与SOC运营.md
│   └── 12_云安全_移动安全_AI安全专题.md
├── projects/                                # 实战项目（10 个）
│   ├── 01_linux_hardening/                  # Linux 基线加固
│   ├── 02_network_scanning/                 # Nmap + Masscan 侦察
│   ├── 03_web_owasp_lab/                    # DVWA / Juice Shop 打靶
│   ├── 04_password_cracking/                # John + Hashcat
│   ├── 05_wireshark_traffic/                # 流量分析与协议还原
│   ├── 06_metasploit_lab/                   # Metasploitable 漏洞复现
│   ├── 07_siem_elk/                         # ELK 构建简易 SIEM
│   ├── 08_memory_forensics/                 # Volatility 内存取证
│   ├── 09_reverse_engineering/              # CrackMe 逆向与 Pwn 入门
│   ├── 10_ctf_capstone/                     # 综合 CTF 通关挑战
│   ├── README.md                            # 项目总览
│   └── requirements.txt                     # Python 依赖
└── assets/                                  # 实验样本、抓包、截图
```

---

## 学习路线图

```
            ┌────────────────────────────────────┐
            │  阶段 0：数学 / 编程 / 网络先修      │
            │  Python · Bash · TCP/IP · 数论基础   │
            └────────────────┬───────────────────┘
                             ▼
       ┌──────────────────────────────────────────┐
       │  阶段 1：安全基础 (Ch 01~04)              │
       │  CIA 模型 · 网络协议安全 · OS · 密码学     │
       └────────────────┬─────────────────────────┘
                        ▼
       ┌──────────────────────────────────────────┐
       │  阶段 2：Web 与信息收集 (Ch 05~06)        │
       │  OWASP Top 10 · OSINT · 被动/主动侦察      │
       │  ▶ 项目 02、03                            │
       └────────────────┬─────────────────────────┘
                        ▼
       ┌──────────────────────────────────────────┐
       │  阶段 3：漏洞利用与渗透 (Ch 07~08)        │
       │  扫描评估 · 漏洞利用链 · 后渗透 · 报告     │
       │  ▶ 项目 04、05、06                        │
       └────────────────┬─────────────────────────┘
                        ▼
       ┌──────────────────────────────────────────┐
       │  阶段 4：二进制与逆向 (Ch 09)             │
       │  汇编 · 栈溢出 · ROP · 格式化字符串        │
       │  ▶ 项目 09                                │
       └────────────────┬─────────────────────────┘
                        ▼
       ┌──────────────────────────────────────────┐
       │  阶段 5：防御 / 取证 / 应急 (Ch 10~11)    │
       │  恶意代码分析 · 数字取证 · SOC / SIEM      │
       │  ▶ 项目 07、08                            │
       └────────────────┬─────────────────────────┘
                        ▼
       ┌──────────────────────────────────────────┐
       │  阶段 6：前沿专题 (Ch 12)                 │
       │  云原生 · 移动端 · AI 安全 · 供应链攻击    │
       │  ▶ 项目 10（综合 CTF）                    │
       └──────────────────────────────────────────┘
```

---

## 推荐学习顺序（16 周完整版）

| 周次 | 阅读章节 | 配套项目 | 目标 |
|------|----------|----------|------|
| 第 1 周 | Ch 01、02 | 项目 01 | 建立安全世界观 & Linux 加固 |
| 第 2 周 | Ch 02 延伸 | 项目 02 | 协议分析 + Nmap 扫描入门 |
| 第 3 周 | Ch 03 | — | Linux / Windows 权限与审计 |
| 第 4 周 | Ch 04 | — | 对称 / 非对称密码 + 数字签名 |
| 第 5 周 | Ch 05 | 项目 03 | OWASP Top 10 打靶（Part 1） |
| 第 6 周 | Ch 05 | 项目 03 | SQL 注入 / XSS / SSRF 深入 |
| 第 7 周 | Ch 06 | — | 被动侦察 + Recon-ng / theHarvester |
| 第 8 周 | Ch 07 | 项目 04 | 口令爆破与哈希破解 |
| 第 9 周 | Ch 08 | 项目 05、06 | 流量分析 + Metasploit |
| 第 10 周 | Ch 08 延伸 | 项目 06 | 横向移动 + 提权 + 内网 |
| 第 11 周 | Ch 09 | 项目 09 | 汇编 + IDA / Ghidra 逆向 |
| 第 12 周 | Ch 09 延伸 | 项目 09 | Pwn 入门：栈溢出 + ret2* |
| 第 13 周 | Ch 10 | 项目 08 | Volatility 内存取证 |
| 第 14 周 | Ch 11 | 项目 07 | ELK + SIEM + 告警规则 |
| 第 15 周 | Ch 12 | — | 云 / 移动 / AI / 供应链专题 |
| 第 16 周 | 综合 | 项目 10 | CTF 综合挑战 + 复盘 |

> 快速上手（6 周短线）：Ch 01 → Ch 02 → Ch 05 → 项目 03 → 项目 05 → 项目 06 → Ch 08 收尾。

---

## 先修知识

1. **编程**：
   - Python：`requests` / `socket` / `scapy` / `pwntools`
   - Shell / Bash 脚本、基础 C 语言
   - 汇编（x86_64 与 ARM 任选一门入门即可）
2. **计算机网络**：
   - TCP/IP 五层模型、三次握手、TLS 握手
   - HTTP/HTTPS、DNS、ARP、ICMP
3. **操作系统**：
   - Linux 文件权限、用户管理、systemd、iptables
   - Windows 账户、注册表、活动目录（AD）基础
4. **数学**：
   - 模运算、素数、有限域（理解 RSA / ECC 前置）
   - 概率基础（对抗样本 / 侧信道分析相关）
5. **实验环境**：
   - VirtualBox / VMware / UTM（Apple Silicon）
   - Kali Linux、Windows 10 靶机、Metasploitable 2/3
   - Docker / docker-compose
   - Burp Suite Community、Wireshark、Nmap、Ghidra

---

## 核心工具速查

| 场景 | 推荐工具 |
|------|----------|
| 信息收集 | `nmap` · `masscan` · `amass` · `theHarvester` · `recon-ng` · `Shodan` |
| Web 渗透 | `Burp Suite` · `OWASP ZAP` · `sqlmap` · `ffuf` · `dirsearch` · `nuclei` |
| 漏洞利用 | `Metasploit` · `ExploitDB` · `msfvenom` · `Cobalt Strike`（研究用途） |
| 密码破解 | `John the Ripper` · `Hashcat` · `hydra` · `crackmapexec` |
| 流量分析 | `Wireshark` · `tshark` · `tcpdump` · `Zeek` · `Suricata` |
| 逆向 / Pwn | `Ghidra` · `IDA Free` · `Radare2` · `x64dbg` · `gdb + pwndbg` · `pwntools` |
| 内存取证 | `Volatility 3` · `Rekall` · `FTK Imager` · `Autopsy` |
| 蓝队 / SIEM | `ELK (Elasticsearch + Logstash + Kibana)` · `Splunk Free` · `Wazuh` · `osquery` · `Sigma` |
| 云安全 | `Prowler` · `ScoutSuite` · `kube-bench` · `Trivy` · `Falco` |

---

## 参考书单

### 基础
- **[红]** Dafydd Stuttard.《Web 应用程序安全权威指南》（The Web Application Hacker's Handbook, 2nd）
- **[紫]** Peter Yaworski.《Real-World Bug Hunting》
- **[黑]** Georgia Weidman.《Penetration Testing: A Hands-On Introduction to Hacking》
- **[蓝]** Chris Sanders.《Practical Packet Analysis (3rd)》

### 进阶
- **[二进制]** Bruce Dang 等.《实用恶意软件分析》(Practical Malware Analysis)
- **[逆向]** Eldad Eilam.《Reversing: Secrets of Reverse Engineering》
- **[Pwn]** Jon Erickson.《黑客之道：漏洞发掘的艺术 (Hacking: The Art of Exploitation)》
- **[密码]** Jean-Philippe Aumasson.《Serious Cryptography》
- **[应急]** Michael Sikorski.《Incident Response & Computer Forensics (3rd)》

### 中文经典
- 吴翰清《白帽子讲 Web 安全》
- 余弦《Web 前端黑客技术揭秘》
- 冯登国《密码学原理与实践》

---

## 在线资源

- OWASP 官方：<https://owasp.org/>
- HackTheBox：<https://app.hackthebox.com/>
- TryHackMe：<https://tryhackme.com/>
- VulnHub：<https://vulnhub.com/>
- PortSwigger Web Security Academy：<https://portswigger.net/web-security>
- PicoCTF：<https://picoctf.org/>
- Exploit-DB：<https://www.exploit-db.com/>
- MITRE ATT&CK：<https://attack.mitre.org/>
- CVE / NVD：<https://nvd.nist.gov/>
- awesome-hacking：<https://github.com/Hack-with-Github/Awesome-Hacking>

---

## 推荐认证路径（可选）

```
入门：Security+ / CEH
进阶：OSCP（攻击方向）/ CompTIA CySA+（防守方向）
高阶：OSCE3 / OSEP / OSWE  |  GCIH / GCFA / GREM（蓝队 / 取证）
专项：AWS Security Specialty · CKS（K8s 安全）· eMAPT（移动端）
```

---

## 使用说明

1. **按阶段学习**：先完整阅读 `chapters/` 下对应章节，再进入 `projects/` 动手。
2. **动手优先**：每个项目目录下包含 `README.md`（实验目标 + 步骤）、脚本、靶机说明。
3. **环境准备**：

```bash
cd projects
python -m venv .venv && source .venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
```

4. **合规与伦理**：
   - 所有攻击性技术**仅限自有环境、授权靶场、CTF 比赛**使用。
   - 未经授权的渗透属于违法行为，参见《中华人民共和国网络安全法》《刑法》第 285、286、287 条。
   - 养成"先授权、再动手；先备份、再测试"的习惯。

5. **持续进阶**：
   - 每周刷 1~2 道 HackTheBox / TryHackMe 机器
   - 关注 CVE 情报（FeedLy 订阅 `tenable`、`Rapid7`、`ThreatPost`）
   - 参加至少 1 场线上 CTF（如 0CTF、强网杯、XCTF）

祝学习愉快，愿你走在白帽子的正道上。🛡️
