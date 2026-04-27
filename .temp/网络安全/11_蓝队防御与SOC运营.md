# 第 11 章 蓝队防御与 SOC 运营

## 11.1 学习目标

1. 理解蓝队的职责地图：**SOC / IR / CTI / 红紫队演练 / 安全工程**。
2. 掌握一个现代 SOC 的技术栈：**日志采集 → SIEM → SOAR → EDR → 威胁情报**。
3. 能写出合格的 **Sigma 规则** 与 **检测工程（Detection Engineering）** 测试。
4. 熟悉 NIST / ISO 27035 的应急响应流程。

---

## 11.2 蓝队组织结构

```
CSO / CISO
   ├── 安全运营中心 (SOC)
   │   ├── L1 监控值班 (Monitor / Triage)
   │   ├── L2 事件响应 (Incident Response, IR)
   │   ├── L3 威胁狩猎 (Threat Hunting)
   │   └── 24/7 排班
   ├── 威胁情报 (CTI)
   ├── 检测工程 (Detection Engineering)
   ├── 安全工程 (DevSecOps / AppSec)
   ├── 红紫队演练 (Red/Purple Team)
   └── GRC（治理 / 风险 / 合规）
```

### 11.2.1 L1 / L2 / L3 SOC 分级

| 等级 | 职责 | 典型技能 |
|------|------|----------|
| L1 | 看告警、做一线 triage | 日志、SIEM 查询、脚本 |
| L2 | 深度调查、取证、闭环 | 动静分析、脚本、DFIR |
| L3 | 高阶狩猎、规则研发、事件主导 | 逆向、检测工程、ATT&CK 精通 |

---

## 11.3 SOC 技术栈

```
      ┌────────────────────────────────────────────┐
      │               情报层 Threat Intel           │
      │ MISP · OpenCTI · ThreatFox · 商业 TI        │
      └───────────────────┬────────────────────────┘
                          │
      ┌───────────────────▼────────────────────────┐
      │            分析层 SIEM / XDR / SOAR         │
      │ Splunk · ELK · Sentinel · Chronicle         │
      │ TheHive · Shuffle · Cortex                  │
      └───────────────────┬────────────────────────┘
                          │
      ┌───────────────────▼────────────────────────┐
      │        检测层 EDR / NDR / CWPP / EPP        │
      │ CrowdStrike · Elastic EDR · Wazuh · Velociraptor │
      │ Suricata · Zeek · 云 WAF                    │
      └───────────────────┬────────────────────────┘
                          │
      ┌───────────────────▼────────────────────────┐
      │         采集层 Sysmon / osquery / fluentd   │
      │ Filebeat · Winlogbeat · NXLog · Vector      │
      └────────────────────────────────────────────┘
```

---

## 11.4 日志采集（Log Source）

| 数据源 | 关注字段 |
|--------|----------|
| Windows Security Log | 4624, 4625, 4672, 4688, 4698, 4720, 1102 |
| Sysmon | 1/3/7/10/11/13/22 |
| Linux auditd | execve, connect, open |
| Firewall / Proxy | 源 IP / 目的 / URL / 威胁类别 |
| EDR | 进程、文件、注册表、网络 |
| 云审计 | AWS CloudTrail / Azure Activity / GCP Audit |
| 身份 | IdP 登录成功/失败 / MFA 挑战 / 可疑登录 |
| DNS / DHCP | 可疑子域 / NXDomain 激增 |
| VPN | 异地登录、同账号多会话 |

### 11.4.1 采集架构示例（ELK + Beats）

```
Winlogbeat / Filebeat  ─► Logstash  ─► Elasticsearch ─► Kibana
                                   \
                                    ─► Kafka（削峰）
```

### 11.4.2 采集优先级（Essential Log Sources）

1. 终端 EDR + Sysmon（进程链）
2. 身份（IdP、AD、Okta、飞书企业身份）
3. 网络出口（代理 + DNS）
4. 云控制面（CloudTrail / Activity）
5. Web 应用（Nginx access / 业务审计）

---

## 11.5 SIEM 建设

### 11.5.1 ELK（开源代表）

```bash
docker compose up -d       # 快速起一个 ELK
# 指标：_cat/indices，分片数 / 保留周期 / 热温冷架构
```

### 11.5.2 Splunk SPL 示例

```splunk
index=wineventlog EventCode=4625
| stats count by src_ip, user
| where count > 20
| sort - count
```

### 11.5.3 检测规则：Sigma（SIEM 中立语法）

```yaml
title: Suspicious PowerShell Download
id: 0b1f2e2d-xxx
status: experimental
description: PowerShell 调用 DownloadString 下载脚本
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 1
    Image|endswith: '\powershell.exe'
    CommandLine|contains:
      - 'DownloadString'
      - 'IEX '
      - 'Invoke-Expression'
  condition: selection
falsepositives:
  - 合法运维脚本
level: high
tags:
  - attack.execution
  - attack.t1059.001
```

用 `sigmac` 转换成 Splunk / ES / Chronicle 查询：

```bash
sigmac -t splunk -c splunk-windows rule.yml
```

---

## 11.6 EDR（Endpoint Detection & Response）

### 11.6.1 典型能力

- 进程创建链路（父子进程、命令行、Hash）
- 文件 / 注册表写入审计
- 网络连接关联
- 内存扫描 / Shellcode 检测
- 一键隔离、远程取证、反向 Shell

### 11.6.2 开源方案

- **Wazuh** = OSSEC + ELK：HIDS + 合规扫描 + Rootkit 检测
- **osquery** + **Fleet**：SQL 查询端点状态
- **Velociraptor**：高阶 DFIR / Hunt
- **Elastic EDR**：集成于 Elastic Security

### 11.6.3 示例：osquery 检测 "从 Temp 执行的未签名程序"

```sql
SELECT p.pid, p.name, p.path, s.authority, s.serial_number
FROM processes p
LEFT JOIN signature s ON p.path = s.path
WHERE p.path LIKE 'C:\\Users\\%\\AppData\\Local\\Temp\\%'
  AND (s.authority IS NULL OR s.result != 'trusted');
```

---

## 11.7 SOAR（编排与自动化）

### 11.7.1 核心能力

- Playbook：事件触发 → 自动收集证据 → 富化 → 决策 → 阻断 / 通知。
- 富化：VirusTotal / Shodan / 威胁情报 / CMDB 查询。
- 执行：防火墙封 IP、EDR 隔离主机、IdP 强制改密。

### 11.7.2 开源工具

- **TheHive** + **Cortex**：告警管理 + 富化分析
- **Shuffle**：可视化 Playbook，开源替代 Splunk SOAR
- **n8n / Elastalert 2**：轻量自动化

### 11.7.3 Playbook 样例：钓鱼邮件处置

```
Trigger: 邮件网关上报 phishing
  ├─ 提取 IOC（URL / 附件 Hash / 发件人）
  ├─ VirusTotal + URLScan 富化
  ├─ 若命中 KEV / 威胁情报 → 自动：
  │    ├─ 邮箱删信 (Graph API)
  │    ├─ 代理封 URL
  │    ├─ 给相关用户发 Teams / 飞书告警
  │    └─ 在 TheHive 创建 Case
  └─ 否则 → 人工复核
```

---

## 11.8 威胁狩猎（Threat Hunting）

### 11.8.1 假设驱动（Hypothesis-Driven）

```
1. 假设（Hypothesis）：攻击者利用 WMI 做横向移动
2. 数据：Sysmon Event 1 + 3 + 17/18, Security 4624
3. 查询：父进程=wmiprvse.exe / 远程登录后 5 分钟内出现 cmd.exe
4. 验证：是否是正常 SCCM / 监控软件
5. 产出：写成一条 Sigma 规则 + 通报
```

### 11.8.2 狩猎矩阵（示例）

| ATT&CK | 行为 | 关键信号 |
|--------|------|----------|
| T1003.001 | LSASS 内存转储 | procdump.exe 读 lsass；MiniDumpWriteDump |
| T1021.002 | SMB/Admin$ 横向 | 4624 Logon Type=3 + 4672 + 5140 |
| T1547.001 | Run 键持久化 | Sysmon 13: HKCU\...\Run |
| T1059.001 | PowerShell 下载 | DownloadString / IEX / -enc base64 |
| T1110.003 | 密码喷洒 | 4625 在多账号上重复失败 |
| T1566 | 钓鱼 | Outlook 启动 mshta / wscript |

---

## 11.9 应急响应（IR）

### 11.9.1 NIST 四阶段

```
Preparation → Detection & Analysis → Containment, Eradication & Recovery → Post-Incident Activity
准备       → 检测与分析            → 遏制 / 清除 / 恢复                → 事后复盘
```

### 11.9.2 关键动作（前 60 分钟）

1. 确认是真告警还是误报。
2. 评估影响：主机数量 / 数据外泄量。
3. 隔离：EDR 隔离、网络分段断开、改密钥。
4. 保留证据：内存、日志、流量。
5. 启动指挥部：作战室 / 事件记录（Who/When/What）。
6. 通知：内部 + 法务 + 监管（依据合规）。

### 11.9.3 事件分级（可按贵公司实际调整）

| 等级 | 触发条件 | SLA |
|------|----------|-----|
| P0 | 生产环境被控、数据外泄、勒索加密 | 立即集结 |
| P1 | 关键服务器被入侵、高危 0day 外网暴露 | < 1h |
| P2 | 受控失败的入侵尝试、内部违规 | < 4h |
| P3 | 异常但无实际影响 | 次日处理 |

---

## 11.10 检测工程（Detection Engineering）

### 11.10.1 规则生命周期

```
Hypothesis → Data Validation → Prototype → Test (Atomic Red Team / Purple Team)
         → Deploy → Monitor FP/TP → Tune → Retire
```

### 11.10.2 Purple Team 演练

- **Atomic Red Team**：<https://github.com/redcanaryco/atomic-red-team> — 基于 ATT&CK 的原子测试。
- **Caldera**：MITRE 的自动化红队平台。
- **Red Team Tools**：C2 模拟、横向移动、数据外带。
- **指标**：MTTD（发现时间）/ MTTR（响应时间）/ 覆盖率（ATT&CK 技术数）。

### 11.10.3 检测覆盖图

推荐工具：`attack-navigator`（<https://mitre-attack.github.io/attack-navigator/>）做可视化，标记每个 ATT&CK 技术当前检测能力：
- `green` 已覆盖 + 高置信
- `yellow` 部分覆盖
- `red` 盲区

---

## 11.11 合规基线

| 行业 | 主要标准 |
|------|----------|
| 国内 | 《网络安全等级保护 2.0》、《关键信息基础设施保护条例》、《数据安全法》、《个人信息保护法》 |
| 金融 | PCI-DSS、JR/T 0071 |
| 医疗 | HIPAA |
| 通用 | ISO 27001 / 27035 / 27701、NIST CSF、SOC 2 |

---

## 11.12 个人蓝队学习环境

```bash
# 1. ELK 一键起
git clone https://github.com/deviantony/docker-elk
cd docker-elk && docker compose up -d

# 2. Sysmon + Winlogbeat 靶机
choco install sysmon-bundle -y
# 配置文件：https://github.com/olafhartong/sysmon-modular

# 3. 下载 Atomic Red Team
IEX (IWR 'https://raw.githubusercontent.com/redcanaryco/invoke-atomicredteam/master/install-atomicredteam.ps1')
Invoke-AtomicTest T1059.001 -ShowDetails
```

搭好后：用 Atomic 触发某个 ATT&CK → 查 Kibana 看是否命中 → 写 Sigma → 迭代。

---

## 11.13 练习题

1. 用 Docker 搭一套 ELK + Winlogbeat + Sysmon 采集环境，让你的 Windows 10 虚拟机事件进入 Kibana。
2. 在 Kibana 里写出以下 3 条检测：
   - 从 `%AppData%\Roaming\` 启动的 PowerShell；
   - 5 分钟内 4625 失败 ≥ 10 次；
   - 新建的"Microsoft Edge"服务但签名者不是微软。
3. 用 Atomic Red Team 触发 `T1003.001`（LSASS dump），验证你的检测能否命中，并填补盲点。
4. 写一份事件响应手册（IR Playbook）模板，覆盖勒索 / 钓鱼 / 内网横向三种场景。

---

## 11.14 SOC 成熟度模型 (SOC-CMM)

SOC-CMM (Rob van Os) 五级：

| Level | 名称 | 特征 |
|-------|------|------|
| 1 | Initial | 临时、被动响应 |
| 2 | Defined | 流程文档化 |
| 3 | Managed | 度量 + 持续改进 |
| 4 | Quantitative | 全面量化 + KPI |
| 5 | Optimizing | 自动化 + 主动威胁狩猎 |

### 11.14.1 自评维度

- Business：使命、客户、范围、SLA
- Process：检测、响应、狩猎、合规
- People：技能矩阵、招聘、培训
- Technology：工具栈、集成度、自动化
- Services：交付的具体服务列表

### 11.14.2 推荐升级路径

```
1 → 2: 写 SOP + 角色分工 + 班次
2 → 3: KPI（MTTD/MTTR）+ 案例库 + 周报
3 → 4: SLA 命中率、覆盖度、训练 hours/quarter
4 → 5: 自动化 playbook 70%+ / 紫队闭环 / 主动狩猎
```

---

## 11.15 检测工程详细流程

### 11.15.1 七阶段

```
1. Hypothesis（假设）
   - 来源：威胁情报 / 红队报告 / ATT&CK 矩阵差距
2. Data Validation（数据可见性）
   - 是否采集了相应日志？字段是否完整？
3. Prototype（规则原型）
   - Sigma / KQL / SPL / EQL
4. Test
   - Atomic Red Team / 自定义 PoC / Purple Team
5. Deploy
   - 灰度 → 生产 → 标注严重级
6. Monitor & Tune
   - FP / FN / 覆盖率
7. Retire
   - 数据源消亡 / 业务变更 / 被更优规则替代
```

### 11.15.2 案例：检测 Lateral Movement via PsExec

```
假设：攻击者用 PsExec 横向到内部服务器
数据：
  - Event ID 4624 Logon Type=3
  - Event ID 4672（特权登录）
  - Sysmon 1: PSEXESVC.exe 服务进程
  - Sysmon 3: 445 端口出站
原型（Sigma）：
  selection_logon:
    EventID: 4624
    LogonType: 3
  selection_psexec:
    EventID: 1
    Image|endswith: '\PSEXESVC.exe'
  timeframe: 5m
  condition: selection_logon AND selection_psexec
测试：用 Atomic T1021.002 触发
部署 → 调优（运维域账号白名单） → 周度回顾
```

### 11.15.3 检测覆盖度可视化

- ATT&CK Navigator：把 Sigma 规则映射到 TXXXX，可视化绿/黄/红
- DeTT&CT (Detection Tooling for ATT&CK)：YAML 配置 + 评分公式
- VECTR：紫队结果跟踪

---

## 11.16 UEBA 与异常检测

### 11.16.1 基线建模

- 单实体（用户 / 主机 / 服务账号）建立"正常画像"
- 维度：登录时间、地理位置、设备、访问资源、流量量级

### 11.16.2 常用算法

| 算法 | 用途 |
|------|------|
| Z-score | 单维度数值异常 |
| IQR | 百分位异常 |
| Isolation Forest | 多维异常 |
| DBSCAN | 聚类离群点 |
| Autoencoder | 高维行为重构误差 |
| Markov Chain | 序列异常 |

### 11.16.3 实战示例

- 凭据滥用：管理员账号在凌晨从 VPN 登录 → 与基线偏差 > 3σ
- 横向移动：账号当天访问的主机数突增（之前 5，今天 50）
- 数据外带：外发流量突变 + 罕见目的国
- 内部威胁：员工在离职日下载大量敏感文档

### 11.16.4 商业工具

- Microsoft Defender for Identity / Sentinel UEBA
- Splunk UBA
- Exabeam
- Securonix

---

## 11.17 EDR 内部结构剖析

### 11.17.1 数据采集层

- **Kernel Driver**：minifilter（文件）/ NDIS（网络）/ Process Notify Callback
- **ETW**（Event Tracing for Windows）：低开销内核事件流
- **AMSI**（Antimalware Scan Interface）：脚本扫描接口

### 11.17.2 行为分析层

- 事件流 → 关联引擎 → 风险评分
- 内存扫描：周期性 / 触发式
- IOC / Yara 规则匹配

### 11.17.3 响应层

- 隔离主机（防火墙规则 + 网络断开但保留管理通道）
- 进程终止 / 文件隔离 / 注册表回滚
- 远程取证（Live Response Shell）

### 11.17.4 EDR 绕过常见技巧

- 直接 syscall（绕用户层 hook）
- AMSI / ETW patching
- LotL（PowerShell / wmic / certutil）
- 内核 callback 摘除（高级 / 需驱动签名漏洞）
- 时间分散（慢节奏 + 混合合法行为）

### 11.17.5 蓝队反制思路

- 多源叠加（EDR + Sysmon + 网络）
- 关键 API（NtReadVirtualMemory、CreateRemoteThread）走 ETW Microsoft-Windows-Threat-Intelligence
- 检测 ETW patch（CALL `EtwEventWrite` 总条数突降）
- AMSI bypass 检测：扫 `AmsiScanBuffer` 的 patched bytes

---

## 11.18 蜜罐与欺骗（Deception）

### 11.18.1 蜜罐分类

| 类别 | 例子 |
|------|------|
| 低交互 | Honeyd、Dionaea |
| 中交互 | Cowrie（SSH/Telnet） |
| 高交互 | T-Pot 集合、Conpot（ICS） |
| 数据库蜜罐 | MongoDB / Elastic / Redis 假实例 |
| Web 蜜罐 | Glastopf、SNARE/Tanner |

### 11.18.2 Honeytoken

- 假凭据（AWS canarytoken / Azure / Google API key）
- 假文件（"salary.xlsx"，访问触发告警）
- 假数据库记录（SQL trap row）
- DNS canary（专用域名一旦解析即告警）

### 11.18.3 部署原则

- 无业务用途，任何访问 = 异常
- 与真实环境同 VLAN / 同子网（吸引内网攻击者）
- 告警通道独立，避免噪音淹没
- 法律合规：在管辖域内 + 不诱导 / 不存储个人信息

---

## 11.19 紫队闭环：Atomic Red Team 实战

### 11.19.1 工作流

```
1. 选 ATT&CK 技术（按风险 + 覆盖差距）
2. 红队执行 Atomic 测试
3. 蓝队记录：是否检测？告警时间？告警内容？
4. 差距分析：写新 Sigma / 调阈值 / 升级数据采集
5. 复测，直到覆盖
6. 文档化 + 周期回归
```

### 11.19.2 推荐 Top 50 入门测试

```
T1003.001 LSASS Memory
T1059.001 PowerShell
T1059.003 Windows Command Shell
T1547.001 Run Key Persistence
T1112    Modify Registry
T1027.002 Software Packing
T1078    Valid Accounts
T1018    Remote System Discovery
T1021.001 RDP
T1021.002 SMB/Admin Shares
T1486    Data Encrypted for Impact
... (按 ATT&CK Top Threats 报告补全)
```

### 11.19.3 自动化平台

- VECTR：开源紫队结果跟踪
- AttackIQ / SafeBreach / Cymulate：商业 BAS（Breach & Attack Simulation）
- Caldera：MITRE，全自动红队

---

## 11.20 SOC KPI 与度量

| KPI | 目标 |
|-----|------|
| MTTD (Mean Time to Detect) | 越短越好；行业目标 < 1h |
| MTTR (Mean Time to Respond) | < 4h（高危） |
| MTTC (Mean Time to Contain) | < 24h |
| 误报率 (FP rate) | < 5% |
| 规则覆盖度（ATT&CK） | 60%+（关键资产 80%+） |
| 告警闭环率 | 95%+ |
| 培训 hours/人/月 | 8h+ |
| 紫队演练频率 | 月度 |

### 11.20.1 数据可视化

- Grafana + Prometheus 仪表盘
- Power BI / Tableau 周报
- 自动周报：脚本拉取 SIEM 数据生成 Markdown / PDF

---

## 11.21 真实案例：Maersk NotPetya 复盘

```
2017 年 6 月 27 日：
  Maersk 乌克兰办事处的 M.E.Doc 财税软件更新被植入 NotPetya
  10 分钟内全球 4 万台机器加密
  全球航运瘫痪 2 周
  恢复：从 4500 台服务器中找到一台未受感染的 DC
  损失：~3 亿美元
```

蓝队启示：
- 单点同源软件更新是高危链路（供应链）
- DC 数量多 + 异地备份救命
- IR 过程中"找到一台未感染的 DC"靠运气，不靠流程
- 后续投入：网络分段、零信任、持续脆弱性管理

---

## 11.22 真实案例：MGM ALPHV 勒索

```
2023 年 9 月：
  社工攻击 MGM 的 IT 服务台 → 重置高权限账户密码
  攻击者拿到 Okta 管理权限
  在 ESXi 集群中部署勒索（直接关 VM 加密 .vmdk）
  MGM 业务瘫痪 ~10 天，损失 ~1 亿美元
```

蓝队启示：
- 服务台是社工高危目标，必须严控身份重置流程（视频核验 / 多人复核）
- IdP 登录异常监控（地理 / 设备 / 频率）
- ESXi 加固（限定管理网 / 强制 MFA / Lockdown Mode）
- 离线备份 + 演练恢复

---

## 11.23 D3FEND 与 ATT&CK 对应

MITRE D3FEND 是防御技术对照矩阵，与 ATT&CK 攻击技术形成"对偶"。

```
ATT&CK Initial Access (T1190 Public-Facing Application)
    ↔ D3FEND  D3-NTA  Network Traffic Analysis
              D3-WAF  Web Application Firewall
              D3-PAC  Application Hardening

ATT&CK Defense Evasion (T1070.004 File Deletion)
    ↔ D3FEND  D3-FFL  File Forensics & Logging
              D3-FCR  File Carving
```

可用于：
- 给防御控制项打 ID
- 评估"我能否对抗某 TTP"
- 与 ATT&CK 一起在管理报告中呈现完整闭环

---

## 11.24 法律与合规联动

### 11.24.1 中国合规

- **网络安全法**：实施安全保护制度、漏洞披露、个人信息保护
- **数据安全法**：分级分类、数据出境
- **个人信息保护法 (PIPL)**：明确同意、数据主体权利
- **网络安全等级保护 2.0**：三级以上系统强制要求 + 测评
- **关基保护条例**：关键信息基础设施特别保护

### 11.24.2 国际

- **NIS2**（欧盟）：扩大覆盖关键行业，更严合规
- **GDPR**：72h 数据泄露通报
- **SEC 4 days disclosure**（美国上市公司）
- **HIPAA**（医疗）/ **PCI-DSS**（支付）

### 11.24.3 SOC 联动法务

- 重大事件法务 / PR / 监管必参与
- 证据保留 7 年（部分行业）
- 跨境取证：协议 + 数据出境合规

---

## 11.25 练习题（扩展）

5. 写一条 Sigma 检测 `wmic process call create` 远程执行。
6. 使用 osquery 写一段定时 5 分钟扫描"未签名 DLL 加载到 lsass.exe"的查询。
7. 给出针对内部服务台社工攻击的 Playbook（参考 MGM 案例）。
8. 设计一个 UEBA 规则检测高管账号在异常时间登录核心系统。
9. 写一篇内部周报模板：包含 KPI、告警 Top10、紫队进度、改进项。
10. 解释 D3FEND 与 ATT&CK 的关系并举例对应一对。

### 参考答案要点

5. 关键字段：`wmic.exe`、`/node:`、`process call create`；上下文：父进程为非 SCCM。
8. Z-score on `(login_hour, login_country)`，阈值 3σ 触发告警。

---

## 11.26 面试高频考点（附参考答案）

**Q1**：为什么 Sigma 比直接写 SPL/KQL 更好？
- SIEM 中立、易共享、可与 ATT&CK 关联；编译到任意目标平台。

**Q2**：你如何设计 SOC 的 KPI？
- 至少包含 MTTD、MTTR、误报率、ATT&CK 覆盖度、告警闭环率，避免只看"告警数量"。

**Q3**：发现入侵后是否要立即拔网线？
- 取决于阶段；早期或破坏性强（勒索）可拔；APT 调查阶段拔网线可能让攻击者警觉，应先采集再决定。

**Q4**：如何评估 EDR 的真实效果？
- 用 Atomic Red Team / Caldera 跑 ATT&CK，统计每条 TTP 是否被检测/拦截；同行评测（MITRE Engenuity）参考。

**Q5**：什么是"Detection in Depth"？
- 多层检测：文件 + 进程 + 网络 + 行为；单层失效后其他层仍可发现。

**Q6**：威胁情报怎么落地？
- 通过 STIX/TAXII 导入 SIEM/EDR；高质量 IOC 自动 block；中等质量做监控；低质量做参考。

**Q7**：UEBA 与传统签名检测互补点？
- 签名擅长已知威胁；UEBA 擅长 0day / 内部威胁 / 慢变；二者结合。

**Q8**：怎么避免告警疲劳？
- 严控规则质量（去 FP）、Tier 化告警、SOAR 自动处理低危、聚合相似告警、值班轮换。

**Q9**：什么是"Detection-as-Code"？
- 把 Sigma / KQL 规则当代码：Git 版本管理、PR 评审、CI 测试、自动部署。

**Q10**：SOC 与 IR 团队的边界？
- SOC 持续监控 + 一线响应；IR 处理重大事件、深度调查。同 SOC 内可能 L1=SOC, L2/L3=IR。

---

## 11.27 延伸阅读

### 教材

- 《Blue Team Handbook: Incident Response Edition》Don Murdoch
- 《Crafting the InfoSec Playbook》Jeff Bollinger
- 《Practical Threat Intelligence and Data-Driven Threat Hunting》Valentina Costa-Gazcón
- 《The Practice of Network Security Monitoring》Richard Bejtlich
- 《Applied Incident Response》Steve Anson

### 标准 / 框架

- NIST SP 800-61r2 IR
- NIST SP 800-86 取证
- ISO/IEC 27035 IR
- MITRE ATT&CK / D3FEND / CTID
- SANS CIS Controls v8
- SOC-CMM

### 资源

- Florian Roth Blog（Sigma 作者）
- SANS DFIR / Internet Storm Center
- The DFIR Report
- Active Countermeasures Threat Hunting Show
- Black Hills Information Security 博客

### 课程 / 认证

- SANS SEC450 / SEC511 / SEC504 / SEC555
- GIAC GMON / GCDA / GCIH / GSOC
- Blue Team Level 1/2 (Security Blue Team)
- HTB Blue Track

---

## 11.28 小结

蓝队的核心不是"用最贵的产品"，而是 **有可解释的检测逻辑 + 可验证的响应流程 + 持续演练**。
红队找 1 个洞就赢，蓝队每天要防 1 万次；所以 **工程化、流程化、自动化** 是唯一出路。

### 与其他章节的接口

- ← Ch07 / Ch08：渗透提供"攻方视角"指导检测
- ← Ch10：取证 / 恶意分析提供 IOC 与规则原料
- → Ch12：云 / 容器 / AI 蓝队特殊技术延伸

### 学习节奏（12 周计划）

- W1-2：搭好 ELK + Sysmon + Atomic Red Team 实验
- W3-4：写 20 条 Sigma 规则 + 全部测试通过
- W5-6：搭 TheHive + Cortex + Shuffle 完成 1 个 Playbook
- W7-8：参与（或模拟）一次紫队演练，复盘报告
- W9-10：UEBA + 异常检测项目（Z-score / Isolation Forest）
- W11：合规自查（等保 / NIS2 / SOC2 选 1）
- W12：写一份 SOC 半年规划文档

### 终极心态

- "防御无法 100%，但可以让攻击者付出更高代价"
- "可解释 > 自动化 > 智能化"：先有清楚逻辑再上 AI
- "演练是真理"：没演练过的应急 = 没有应急
- "记录文化"：每个事件、每条规则、每次复盘都留下文档

---

## 11.29 Sigma 完整规范

### 11.29.1 全字段结构

```yaml
title:        # 必填，描述
id:           # UUID 唯一
status:       # stable / test / experimental / deprecated
description:  # 详细说明
references:   # 引用链接
author:       # 作者
date:         # 创建日期
modified:     # 修改日期
tags:         # ATT&CK / CVE / 自定义
logsource:    # product / service / category
detection:
  selection_<n>:
    field|modifier: value
  filter_<n>:
    ...
  condition: <逻辑表达式>
  timeframe:  # 1m / 1h / 1d
fields:       # 输出关键字段
falsepositives: # 已知误报情况
level:        # informational / low / medium / high / critical
```

### 11.29.2 字段修饰符（Modifiers）

| 修饰符 | 含义 |
|--------|------|
| `contains` | 子串匹配 |
| `startswith` / `endswith` | 前后缀 |
| `re` | 正则 |
| `cidr` | IP 段 |
| `base64offset` | base64 编码后偏移匹配 |
| `windash` | 兼容 `-`、`/`、`-`/`--`/`/` |
| `expand` | 内置变量展开 |
| `i` (大小写不敏感) | 默认大小写敏感 |

### 11.29.3 condition 语法

```yaml
condition:
  selection_a and not filter_a
  1 of selection_*
  all of selection_*
  selection_a and (selection_b or selection_c)
  selection_a | count(user) by host > 10
```

### 11.29.4 Aggregation（聚合）

```yaml
detection:
  selection:
    EventID: 4625
  timeframe: 5m
  condition: selection | count() by user > 10
```

不是所有 SIEM 后端都支持完整聚合，需在 sigmac / pySigma 转换时确认。

### 11.29.5 二十条优秀示例规则参考

1. PowerShell 编码命令 (`-enc`)
2. WMI 远程执行 (`wmiprvse.exe` 父进程)
3. 服务安装新二进制（EventID 7045）
4. 计划任务建立（EventID 4698 + 可疑命令）
5. 域控异常 LDAP 搜索（BloodHound 扫荡）
6. mimikatz 关键字（`sekurlsa::logonpasswords`）
7. AdFind 工具运行
8. Cobalt Strike Beacon 默认 named pipe (`\\.\pipe\msagent_*`)
9. UAC 绕过（fodhelper.exe / sdclt.exe）
10. AMSI Bypass 字符串
11. ETW Patch 字符串 (`0x00,0xC3` near `EtwEventWrite`)
12. lsass.exe 被 procdump / minidump 访问
13. wevtutil cl 清除日志
14. vssadmin delete shadows
15. bcdedit /set safeboot
16. cmstp.exe 滥用
17. regsvr32 /s /u /i:http
18. mshta http://
19. rundll32 加载未签名 DLL
20. PrintNightmare 引用 SpoolerPipeName

---

## 11.30 KQL / SPL 实战速查

### 11.30.1 Microsoft Sentinel KQL

```kql
// 高频登录失败 + 后续成功登录（密码喷洒）
SecurityEvent
| where TimeGenerated > ago(1h)
| where EventID in (4625, 4624)
| summarize
    failures = countif(EventID == 4625),
    successes = countif(EventID == 4624)
    by Account, IpAddress
| where failures > 20 and successes > 0

// 检测可疑 PowerShell
DeviceProcessEvents
| where FileName =~ "powershell.exe"
| where ProcessCommandLine matches regex "(?i)(downloadstring|iex|invoke-expression|hidden|encodedcommand)"
| project DeviceName, AccountName, ProcessCommandLine, InitiatingProcessFileName
```

### 11.30.2 Splunk SPL

```splunk
index=main sourcetype=WinEventLog:Security EventCode=4625
| stats count by user, src_ip
| where count > 10

index=sysmon EventCode=1 ParentImage="*\\winword.exe" Image="*\\powershell.exe"
| table _time host User CommandLine
```

### 11.30.3 Elastic EQL

```eql
sequence by user.name with maxspan=10m
  [ authentication where event.outcome == "failure" ] with runs=10
  [ authentication where event.outcome == "success" ]
```

### 11.30.4 跨平台心智模型

| 概念 | KQL | SPL | EQL |
|------|-----|-----|-----|
| 表 | `TableName` | `index=` | `process where ...` |
| 过滤 | `where` | `search` | `where` |
| 聚合 | `summarize` | `stats` | `| sequence` |
| 时间窗 | `bin(timestamp, 5m)` | `_time bucket` | `with maxspan=` |

---

## 11.31 IR 演练剧本（完整模板）

### 11.31.1 Ransomware Tabletop Exercise

```
场景设定（注入 1）：
  T+0: SOC 收到 EDR 告警："批量文件被加密"
  受影响主机：财务部 PC × 3

讨论问题：
  - 谁拥有 IR Decision 权限？
  - 是否立即断网？影响范围？
  - 内存取证 vs 直接关机的取舍？

注入 2：
  T+30min: 备份服务器也开始加密

讨论问题：
  - 备份隔离是否有效？
  - 是否有离线 / 不可变备份？
  - 启动 BCP/DRP 的阈值？

注入 3：
  T+2h: 攻击者邮件要求 200BTC 否则公开数据

讨论问题：
  - 法务 / 公关 / 监管报告时间线？
  - 是否谈判？谁谈？通过谁？
  - 数据是否真有外泄？如何验证？

输出：
  - 决策清单 + 责任人 + SLA
  - 演练报告 + 改进项 Jira
```

### 11.31.2 Phishing Tabletop

```
场景：CFO 收到伪装成 CEO 的邮件，要求紧急转账 $500K
关键点：
  - BEC（Business Email Compromise）识别
  - 转账内控（双签 / 通话核验）
  - 邮件认证（DMARC / SPF / DKIM）
```

### 11.31.3 0day 外网暴露 Tabletop

```
场景：媒体爆料一个未公开的 RCE 漏洞，影响你公司核心产品
关键点：
  - 是否真存在 0day？取证团队启动
  - WAF 临时规则 / 临时下线
  - 客户通知话术
  - 与监管 / 法务 / 公关同步
```

---

## 11.32 数据保留与隐私

### 11.32.1 日志保留期参考

| 类型 | 推荐保留 |
|------|----------|
| EDR / Sysmon | 90 天热 + 1 年冷 |
| Windows Security | 1 年 |
| 防火墙 / 代理 | 6 个月 |
| 邮件网关 | 1 年 |
| 云审计 (CloudTrail) | 永久（或合规要求） |
| 流量元数据 (Zeek/Netflow) | 30-90 天 |
| 全包 PCAP | 7-30 天（受存储约束） |

### 11.32.2 隐私合规

- 不在日志保存敏感个人信息（身份证、密码明文）
- 必要时脱敏（哈希、Tokenization）
- GDPR：日志中如有 PII，需按数据主体请求删除（除非保留有合法依据）
- 跨境传输：数据出境需评估（PIPL / GDPR）

---

## 11.33 蓝队工具链一览（2026）

| 类别 | 推荐 |
|------|------|
| SIEM | Splunk / Sentinel / Chronicle / Elastic / Wazuh |
| EDR | CrowdStrike / SentinelOne / Defender for Endpoint / Elastic / 奇安信 |
| NDR | ExtraHop / Vectra / 知道创宇 / 长亭 |
| SOAR | Splunk SOAR / Tines / Shuffle / TheHive+Cortex |
| IDS/IPS | Suricata / Zeek / Snort |
| Honeypot | T-Pot / Cowrie / Canary |
| Threat Intel | MISP / OpenCTI / VirusTotal Enterprise |
| DFIR | Velociraptor / GRR / KAPE / Eric Zimmerman tools |
| Vulnerability | Tenable / Qualys / Rapid7 / 长亭 X-Ray |
| Cloud | Wiz / Orca / Prisma Cloud / 阿里云安全中心 |
| ASM | Censys ASM / RunZero / 知道创宇空间测绘 |
| Asset / CMDB | Snipe-IT / Lansweeper / 飞书表格 |
| Phishing 训练 | KnowBe4 / Cofense / GoPhish |
| 报告 | Markdown + Pandoc / Confluence / Notion |

---

## 11.34 蓝队职业进阶路径

```
入门：HTB / TryHackMe Blue 房间，Wazuh + ELK 起步
↓
SOC L1 实习：值班 + 简单 triage
↓
检测工程师：写规则 / 紫队闭环
↓
威胁狩猎师：假设驱动 / 数据科学应用
↓
IR Lead：主导重大事件 / 合规对接
↓
CTI / 架构 / 总监方向
```

证书路径建议：BTL1 → GMON → GCIH → GCDA → GSE / GCFA / GCFR。

---

## 11.35 复盘检查表（蓝队篇）

- [ ] 我能解释 SOC 三层架构与每层工具
- [ ] 我能写 Sigma 规则并部署到至少 2 个 SIEM
- [ ] 我能用 Atomic Red Team 验证至少 30 个 ATT&CK TTP
- [ ] 我能给 CISO 讲清 SOC-CMM 现状 + 升级计划
- [ ] 我能在 30 分钟内完成一次模拟勒索的 IR 决策树
- [ ] 我了解中国合规（等保 + 关基 + 数安 + 个保）边界
- [ ] 我能解释 EDR 内部数据采集机制和绕过方法
- [ ] 我能从一段日志推断攻击者所处的 ATT&CK 阶段

---

## 11.36 蓝队需重点检测/响应的历史 CVE

| CVE | 检测要点 |
|-----|---------|
| CVE-2017-0144 (EternalBlue) | SMBv1 异常包 + 445 端口横向 |
| CVE-2020-1472 (Zerologon) | NetLogon 异常 RPC + DC 密码重置 |
| CVE-2021-26855 (ProxyLogon) | Exchange `/owa/auth/x.js` 等异常 URL + webshell |
| CVE-2021-34527 (PrintNightmare) | spoolsv.exe 加载非常见 DLL |
| CVE-2021-44228 (Log4Shell) | JNDI 出站 LDAP/RMI / Suricata sigs |
| CVE-2022-26134 (Confluence OGNL) | 异常 OGNL URI 模式 |
| CVE-2023-23397 (Outlook NTLM) | 出站 SMB / WebDAV 到陌生域 |
| CVE-2023-34362 (MOVEit) | 异常 sysadmin SQL + 上传 .aspx |
| CVE-2024-3094 (xz-utils) | sshd 异常分支 + 关键二进制变化 |
| CVE-2024-21412 (SmartScreen Bypass) | LNK / URL 文件触发 PowerShell 链 |
