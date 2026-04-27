# 第 6 章 信息收集与 OSINT（开源情报）

## 6.1 学习目标

1. 建立渗透测试 / 红队行动的**侦察（Reconnaissance）**思维：先地图，后攻击。
2. 掌握 **被动 / 主动侦察** 的分界、合规边界与工具链。
3. 能对一个目标域名 / 公司 / 个人做出结构化的 OSINT 画像。
4. 学会整理侦察成果（子域、资产、泄露、凭证），为漏洞评估阶段供料。
5. 理解 OPSEC（操作安全）：让自己在侦察中"留痕最少、可追溯最难"。
6. 复盘 SolarWinds、APT29、APT41 等真实事件中 OSINT 阶段的关键作用。

**能力矩阵**：

| 能力域 | 入门 | 进阶 | 精通 |
|--------|------|------|------|
| 资产 | `whois` + `dig` | 子域聚合 + ASN 扫荡 | 自动化全套 recon pipeline |
| 凭证 | GitHub 关键字搜 | trufflehog 熵分析 | 写正则+entropy+context AI 模型 |
| 人员 | LinkedIn 翻 | 邮件命名推断 | 跨平台关联分析（Maltego） |
| 防御 | 关闭 WHOIS 公开信息 | CT 监控 + DLP | 影子资产治理 + Honeytoken 部署 |

---

## 6.2 情报模型：从 Data 到 Intel

```
                   决策与行动
                       ▲
                       │ Intelligence (情报)
                       │
                       │ 经分析、关联、上下文化
                       ▲
                  Information (信息)
                       │
                       │ 经清洗、组织、聚合
                       ▲
                    Data (数据)
                  (原始观察 / 抓取)
```

OSINT 的本质：从"数据"到"情报"的**转化能力**远比"采集"工具重要。

---

## 6.3 侦察分类

```
                    ┌──────────────┐
                    │   侦察目标     │
                    │ 域名/IP/人员/组织│
                    └──────┬───────┘
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌────────────────┐         ┌────────────────┐
     │ 被动侦察 Passive │         │ 主动侦察 Active  │
     │ 不接触目标       │         │ 直接与目标交互    │
     │ 公开情报 / 缓存  │         │ 端口扫描 / 指纹  │
     └────────────────┘         └────────────────┘
```

| 维度 | 被动侦察 | 主动侦察 |
|------|----------|----------|
| 是否接触目标 | ❌ | ✅ |
| 是否留痕 | 几乎无 | 可被 IDS / WAF 记录 |
| 合规性 | 高 | 需授权 |
| 典型工具 | `Shodan`, `Censys`, `theHarvester`, `Google Dork` | `nmap`, `masscan`, `amass active`, `ffuf` |

> 未授权对真实目标发起主动侦察是违法的，务必在自有靶场或已签 SOW 的环境中练习。

---

## 6.4 OPSEC：让自己不被追到

### 6.4.1 网络层 OPSEC

- 选择"干净"出口：Tor / 商业 VPN / 跳板 VPS（建议二者叠加）
- 避免重复使用同一出口 IP 做不同任务（容易被聚合）
- 禁用 IPv6 泄露、WebRTC 泄露
- DNS：用 DoH / DoT，并锁定 resolver

### 6.4.2 浏览器指纹

- TLS：JA3 / JA4 指纹
- HTTP：UA、Accept-Language、Headers 顺序
- Canvas / WebGL / Font 指纹
- 时区与语言要与"你的化身"一致

### 6.4.3 账号 / 凭据隔离

- 一个化身（persona）= 独立邮箱 + 独立电话 + 独立支付 + 独立设备
- 设备：Whonix / Qubes / Tails 提供较好隔离
- 邮箱：ProtonMail / Tutanota；避免与现实身份共用密码或恢复邮箱

### 6.4.4 行为层

- 工作时区不要与你真实生活时区高度一致
- 写作风格、错别字模式、emoji 偏好都可作为同一化身的指纹（stylometry）

### 6.4.5 工具层

- 抓包 + 出口流量自检：Wireshark + mitmproxy
- 浏览器：Tor Browser / Mullvad Browser；隔离扩展
- 搜索：DuckDuckGo / Searx；不要登录 Google

---

## 6.5 OSINT 情报源

### 6.5.1 域名 / 资产

- **WHOIS**：`whois example.com`（注意 GDPR 后很多字段匿名化）
- **ASN / CIDR**：<https://bgp.he.net/>、`whois -h whois.radb.net -- '-i origin AS15169'`
- **证书透明度 (CT Logs)**：<https://crt.sh>、<https://censys.io/certificates>
- **DNS 历史**：`SecurityTrails`、`ViewDNS.info`、`DNSdumpster`
- **被动 DNS**：`VirusTotal Passive DNS`、`PassiveTotal`、`Farsight DNSDB`
- **互联网测绘**：`Shodan`、`Censys`、`ZoomEye`、`Fofa`、`Quake`、`Hunter`
- **Wayback Machine / Common Crawl**：找历史接口、已下线但 DNS 仍指向的资产

### 6.5.2 子域枚举工具底层原理

| 工具 | 主要数据源 / 技术 |
|------|-----------------|
| `subfinder` | 整合 30+ 公开 API（CT、PassiveDNS、搜索引擎） |
| `amass` | 被动 + 主动 + 反向 DNS + 字典爆破 + ASN 扫荡 |
| `assetfinder` | 简易聚合多源 |
| `puredns` | 极速 DNS 爆破 + wildcard 检测 |
| `crtsh` 类 | CT 日志直接拉 |
| `chaos` | ProjectDiscovery 维护的子域数据集 |
| `dnsx` | 异步 DNS 查询 |
| `gospider / katana` | 爬页面找子域 |

#### CT (Certificate Transparency) 原理

CT 强制 CA 把签发的每张证书写入公共 append-only Merkle Log。任何人都能查询历史证书 → 反查子域名。

```
Merkle Tree:
         Root
        /    \
       /      \
    H(0,3)   H(4,5)
    / \      / \
  H(0)..   H(4) H(5)
  Leaf = SHA256(0x00 || cert)
```

CT API：
- `https://crt.sh/?q=%25.example.com&output=json`
- `https://api.certspotter.com/v1/issuances?domain=example.com&include_subdomains=true`

#### 子域枚举推荐工作流

```bash
# 被动
subfinder -d example.com -all -silent       > p1.txt
amass enum -passive -d example.com -silent  > p2.txt
curl -s "https://crt.sh/?q=%25.example.com&output=json" \
  | jq -r '.[].name_value' | tr ',' '\n' | sort -u > p3.txt
chaos -d example.com -silent                > p4.txt 2>/dev/null

# 字典爆破（主动，需授权）
puredns bruteforce best-dns-wordlist.txt example.com -r resolvers.txt -q > a1.txt

# 聚合 + 解析
cat p*.txt a*.txt | sort -u | dnsx -resp-only -silent > resolved.txt

# 存活
httpx -l resolved.txt -title -tech-detect -status-code -tls-grab -silent -o live.json
```

### 6.5.3 Google Dork / 搜索引擎语法

| 语法 | 作用 |
|------|------|
| `site:example.com` | 限定站点 |
| `inurl:admin` | URL 包含关键词 |
| `intitle:"index of"` | 标题包含关键词（常用于找列目录） |
| `filetype:pdf confidential` | 指定文件类型 |
| `ext:sql password` | 扩展名（同 filetype） |
| `"password" site:github.com` | GitHub 泄露 |
| `-site:example.com` | 排除 |
| `cache:` | 网页快照（已逐步弃用） |
| `before:2023-01-01 after:2022-01-01` | 时间范围 |

Dork 数据库：Google Hacking Database（GHDB）<https://www.exploit-db.com/google-hacking-database>

#### 高价值 Dork 示例

```
site:example.com inurl:redirect= OR inurl:url= OR inurl:next=    # SSRF/Open redirect
site:example.com ext:env "DB_PASSWORD"                            # .env 泄露
intitle:"Apache Tomcat/" inurl:/manager/                          # Tomcat 后台
"index of" "parent directory" backup ext:sql
inurl:".git/HEAD" -github                                          # 暴露 .git
filetype:json "client_secret" site:github.com
```

### 6.5.4 代码 / 凭证泄露

#### GitHub 关键字搜索

```
"AWS_ACCESS_KEY_ID" example.com
"BEGIN PRIVATE KEY" example.com
"client_secret" "example.com"
filename:.env example.com
filename:credentials extension:json AWS
```

#### 工具

- **TruffleHog**：扫 git 历史 + 检测高熵字符串 + 80+ 验证 API
- **gitleaks**：基于规则 + 熵
- **noseyparker**：基于 BERT 的语义识别（可选）
- **gitGraber**：实时监控

#### TruffleHog 熵检测原理

熵 H(X) = -Σ p(xᵢ) log₂ p(xᵢ)。对长字符串计算 Shannon 熵：

- Base64：高熵 (≈ 4.5–6 bits/char)
- 普通英文：低熵 (≈ 4.0)

阈值默认 4.5（base64）/3.0（hex）。配合自定义 regex 减少误报。

#### 公开数据集

- HaveIBeenPwned (HIBP)：泄露邮箱查询
- Dehashed / Snusbase / Leak-Lookup（付费）
- Intelx：暗网检索引擎
- BreachForums / RaidForums 历史 dump

### 6.5.5 人员 OSINT

#### 命名规则推断

```
first.last@   (全名)
flast@        (首字母+姓)
first@        (单名)
last.f@       (反序)
```

工具：`theHarvester`、`hunter.io`、`phonebook.cz`、`emailrep.io`。

#### LinkedIn / 社媒

- LinkedIn：公司架构、汇报关系、招聘技术栈
- Twitter/X：技术博客、抱怨某产品 → 推断内部使用
- 微博 / 脉脉 / BOSS：中国本土场景
- GitHub：员工开源活跃度
- Crunchbase：公司投资人

#### Maltego

可视化关联：以一个 entity 为根，跑 Transform 自动展开关联节点（域名→IP→ASN→公司→员工→邮箱）。

### 6.5.6 文件 / 图像 OSINT

#### 文件元数据 (EXIF / DocProperties)

```bash
exiftool photo.jpg
exiftool *.pdf | grep -E "Author|Producer|Path"

# 批量清除
exiftool -all= -overwrite_original photo.jpg
```

关注：
- 图像：相机型号、GPS 坐标、拍摄时间
- PDF/Office：作者、内部模板路径、域用户名、打印机
- Office 文档的 RSID 隐式追踪

#### 图像反查与定位

- **TinEye / Google / Yandex 图片**：反向搜图找原始来源
- **GeoGuessr 思路**：路标、植被、建筑风格、电线杆、车牌
- **天文/天气校验**：拍摄时该地的天气、太阳角度
- **建筑识别**：Google Lens、PimEyes（人脸，争议大）

#### 视频 OSINT

- 帧间隔分析 → 推断帧率与录制设备
- 音频指纹 → 比对地标声（教堂钟声、地铁报站）
- 反射 / 玻璃倒影 → 推断拍摄者位置

### 6.5.7 Shodan / Censys / FOFA / Quake 查询语法

#### Shodan

| 语法 | 说明 |
|------|------|
| `org:"Example Inc"` | 组织名 |
| `net:192.0.2.0/24` | IP 段 |
| `port:3389 country:CN` | 指定端口 + 地理位置 |
| `product:"nginx" version:"1.18.0"` | 软件版本 |
| `http.title:"Jenkins"` | HTTP 标题 |
| `ssl.cert.subject.CN:"example.com"` | 证书 CN |
| `vuln:CVE-2021-44228` | 已知漏洞 |
| `hash:` | favicon 哈希（mmh3） |
| `os:"Windows Server 2019"` | 操作系统 |

#### FOFA

```
domain="example.com" && port="443"
title="后台管理" && country="CN"
body="Apache Struts" && protocol="https"
header="X-Powered-By: PHP" && status_code="200"
icon_hash="0123456789"
cert.is_valid=true && cert.is_match=true
```

#### Censys

```
services.tls.certificates.leaf_data.subject.common_name: example.com
services.http.response.headers.server: "nginx"
services.banner: "OpenSSH_8.2p1"
location.country: "CN" and services.port: 22
```

#### Quake (360)

```
domain:"example.com"
favicon:"0123abc"
country_cn:"中国" && app:"WordPress"
```

#### 配额与去重策略

- 大目标按 ASN / IP 段切批
- 用 `uncover` 同时查多源去重
- 缓存到本地 SQLite，避免重复消耗 API 配额
- 设置 `max_results` 谨防意外烧 quota

### 6.5.8 暗网 OSINT

- Tor 入口：Ahmia、Onion.ly（注意法律风险）
- 暗网商品 / 论坛监控（仅作威胁情报）
- 数据 dump 监控（CISO 级关心）

---

## 6.6 Recon 工具链示例

```
阶段 1：被动数据采集
  amass (passive) + subfinder + crt.sh + GitHub Dork
        ▼
阶段 2：聚合与去重
  anew / sort -u
        ▼
阶段 3：存活 + 指纹
  httpx + nuclei -t technologies/
        ▼
阶段 4：端口 + 服务
  nmap -sC -sV -p- live.txt
        ▼
阶段 5：内容发现
  ffuf / feroxbuster + waybackurls + gau + katana
        ▼
阶段 6：JS 解析、API endpoint、隐藏参数
  ParamSpider / param-miner / linkfinder
        ▼
阶段 7：漏洞扫描（交给 Ch07 / Ch08）
```

### 6.6.1 常用命令速查

```bash
# 子域枚举 + 存活
subfinder -d target.com -silent | httpx -silent > live.txt

# Wayback / GAU 历史 URL
gau target.com | tee urls.txt
waybackurls target.com | anew urls.txt
katana -u https://target.com -jc -d 3 | anew urls.txt

# 常见敏感文件
ffuf -u https://target.com/FUZZ -w raft-large-files.txt -mc 200,302

# JS 文件里找接口 / 凭证
gau target.com | grep -E '\.js(\?|$)' | httpx -silent | while read u; do
  curl -s "$u" | grep -Eo '(api|token|key|secret|password)["=: ]+[^"]+' ;
done
```

### 6.6.2 推荐的轻量 "all-in-one" 工作流

```bash
# reNgine / ProjectDiscovery 的 uncover + nuclei
uncover -q 'ssl:"target.com"' -silent | nuclei -t cves/ -severity high,critical
```

---

## 6.7 完整 Python `recon.py` 脚本

```python
#!/usr/bin/env python3
"""recon.py - all-in-one 子域 + 存活 + 指纹 + 凭证扫描
依赖: subfinder, httpx, nuclei, trufflehog, jq
"""

import argparse, json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

def run(cmd, **kw):
    print(f"[+] {cmd}", file=sys.stderr)
    return subprocess.run(cmd, shell=True, check=False, **kw)

def subfinder(domain, out):
    run(f"subfinder -d {domain} -all -silent -o {out}")

def amass_passive(domain, out):
    run(f"amass enum -passive -d {domain} -silent -o {out}")

def crtsh(domain, out):
    cmd = (f"curl -s 'https://crt.sh/?q=%25.{domain}&output=json' "
           f"| jq -r '.[].name_value' | tr ',' '\\n' | sort -u > {out}")
    run(cmd)

def merge_unique(files, out):
    run(f"cat {' '.join(files)} | sort -u > {out}")

def httpx_probe(input_file, out_json):
    run(f"httpx -l {input_file} -title -tech-detect -status-code "
        f"-tls-grab -silent -json -o {out_json}")

def nuclei_scan(input_file, out):
    run(f"nuclei -l {input_file} -severity critical,high,medium "
        f"-silent -j -o {out}")

def trufflehog_org(org, out):
    run(f"trufflehog github --org={org} --json > {out}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("domain")
    parser.add_argument("--org", help="GitHub org for trufflehog")
    parser.add_argument("--out", default="recon_out")
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(exist_ok=True)
    domain = args.domain

    files = {
        "sub_subfinder": out / "sub_subfinder.txt",
        "sub_amass":     out / "sub_amass.txt",
        "sub_crtsh":     out / "sub_crtsh.txt",
        "all_subs":      out / "all_subs.txt",
        "live_json":     out / "live.json",
        "nuclei":        out / "nuclei.json",
        "trufflehog":    out / "trufflehog.json",
    }

    with ThreadPoolExecutor(max_workers=3) as pool:
        pool.submit(subfinder,    domain, files["sub_subfinder"])
        pool.submit(amass_passive,domain, files["sub_amass"])
        pool.submit(crtsh,        domain, files["sub_crtsh"])

    merge_unique(
        [files["sub_subfinder"], files["sub_amass"], files["sub_crtsh"]],
        files["all_subs"],
    )
    httpx_probe(files["all_subs"], files["live_json"])
    live_hosts = out / "live.txt"
    run(f"jq -r '.url' {files['live_json']} > {live_hosts}")
    nuclei_scan(live_hosts, files["nuclei"])

    if args.org:
        trufflehog_org(args.org, files["trufflehog"])

    print(f"\n[OK] Recon finished. See: {out}")

if __name__ == "__main__":
    main()
```

使用：

```bash
chmod +x recon.py
./recon.py example.com --org example-inc --out ./recon-example
```

---

## 6.8 OSINT 实操案例：以 `example.com` 为目标

> 仅演示用法，实际执行前必须有书面授权。

1. **资产**：`crt.sh` → 100+ 历史证书 → 提取 SAN → 得到子域列表。
2. **归属**：`bgp.he.net` → ASN → CIDR → `nmap -sn` 快速存活扫描。
3. **泄露**：`github.com/search?q="example.com"+password` → 发现一个历史 commit 含 Slack Webhook。
4. **员工**：LinkedIn → 50+ 员工 → `theHarvester -d example.com -b all` → 生成 1000+ 邮箱 → `haveibeenpwned` 批量核验。
5. **文件**：`site:example.com filetype:pdf` → `exiftool` 提取元数据 → 得到内部作者名 + Office 版本。
6. **Wayback**：拉历史 URL → 找到一个已下线但 DNS 仍指向的子域 `legacy.example.com` → 子域接管。
7. **产出**：生成 `recon-<date>.md`，字段包括：资产、人员、凭证泄露、技术栈、敏感目录、低悬果（如 Jenkins 未授权）。

---

## 6.9 真实案例复盘

### 6.9.1 SolarWinds / SUNBURST (2020)

虽然主链路是供应链投毒，但 APT29 在前期 OSINT 阶段已有大量准备：

- 通过 LinkedIn / GitHub 搜索 SolarWinds 内部技术栈
- 通过 NuGet / GitHub 找到 Orion 平台插件接口
- 提前注册 `avsvmcloud[.]com` 作为 C2 域，模仿合法子域命名
- 关注公司财报 / 客户列表，决定下游攻击优先级

### 6.9.2 APT29 对国家级邮件账号的钓鱼

OSINT 阶段：
1. 公开新闻锁定目标人物（外交、政府）
2. LinkedIn / 履历找其邮箱命名
3. Pastebin / 旧 dump 找历史密码（撞库）
4. 通过 OAuth Device Flow / Modern Auth 绕过 MFA

### 6.9.3 APT41 对游戏行业供应链

侦察重点：
- 游戏公司开发分支 → 找开发服 / Jenkins / GitLab 暴露面
- 工程师社交账号 → 钓鱼模板个性化
- 第三方 SDK 库 → 投毒入口

### 6.9.4 数据中介：Dark Reading 报道的 ShinyHunters

通过对 AWS S3 / Azure Blob 的 OSINT 大规模索引，定期爬开放存储桶，分类倒卖。

---

## 6.10 防守视角：如何减小自己的攻击面

| 控制项 | 建议 |
|--------|------|
| DNS | 敏感子域使用独立 DNS / 内部解析；删除历史记录 |
| 证书透明度 | 不可避免被公开；但要监控 CT 日志里出现的"假冒证书" |
| 员工 OSINT | 员工关闭 LinkedIn 的公司邮箱可见性；强制 2FA |
| GitHub | 启用组织级 Secret Scanning + Push Protection |
| 文档 | PDF / DOC 发布前用 `exiftool -all=` 清理元数据 |
| 互联网测绘 | Shodan Monitor 订阅，及时下线暴露面 |
| 影子 IT | 资产清单 + 持续 attack surface management (ASM) |
| Honeytoken | 故意放置可识别假凭证，监控被使用即告警 |

### 6.10.1 Honeytoken 部署示例

```bash
# 1. AWS canarytoken
# https://canarytokens.org/ → 生成 fake AWS key
# 把它放进一个看起来像生产仓库的私有 repo

# 2. 自托管 alerting
# CloudTrail 监控 GetCallerIdentity / ListUsers 调用
# 一旦看到非法 IP 用此 key → 立即告警 + Block
```

---

## 6.11 工具速查卡

```bash
# 必装
brew install nmap amass jq exiftool
pipx install theHarvester shodan trufflehog

# Go 系（ProjectDiscovery）
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install -v github.com/projectdiscovery/uncover/cmd/uncover@latest
go install -v github.com/projectdiscovery/katana/cmd/katana@latest
go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest
go install -v github.com/projectdiscovery/chaos-client/cmd/chaos@latest

# 其他常用
go install -v github.com/tomnomnom/anew@latest
go install -v github.com/tomnomnom/waybackurls@latest
go install -v github.com/lc/gau/v2/cmd/gau@latest
go install -v github.com/owasp-amass/amass/v4/...@master
```

---

## 6.12 练习题

1. 写一个 Python 脚本：输入一个域名，输出子域、存活 HTTP 服务、技术指纹（基于 `subfinder` + `httpx` 的 JSON 输出聚合）。
2. 在 `crt.sh` 上检索你所在学校 / 公司的主域名，统计过去 12 个月申请了多少张证书。
3. 使用 `trufflehog github --org=<你自己的组织>` 扫描你自己的开源仓库，检查是否有 secret 泄露。
4. 学习如何在不访问目标网站的前提下（纯被动）还原其后端技术栈。
5. 给一张普通照片，请用 EXIF + 反向搜图 + 街景比对得出可能的拍摄地点。
6. 用 mitmproxy 抓取 Tor Browser 与 Chrome 的 TLS 握手，比较 JA3 指纹差异。
7. 对自己注册过的某个论坛账号做"自我画像"——你能从公开 OSINT 信息中扒出多少？
8. 使用 Shodan 找到至少 5 个开放的 Memcached 实例（仅观察，禁止交互），描述这些资产的归属推断方法。
9. 给一段 Base64 字符串，用 Shannon 熵公式编程判断其是否可能是密钥。
10. 写一个 Atomic Red Team-like 的"OSINT 自检"脚本：扫一遍公司 GitHub Org 看是否有 secret 暴露。

### 参考答案要点

1. 见 §6.7 `recon.py` 模板。
2. `curl -s "https://crt.sh/?q=%25.example.edu&output=json" | jq '[.[] | select(.entry_timestamp > "2025-01-01")] | length'`
5. `exiftool` GPS → Google Maps 验证；缺 GPS 时使用太阳方位、植被类型、车牌前缀。
6. Tor Browser 默认禁用 JA3-leaking extension；`tshark -Y ssl.handshake.type==1 -T fields -e tls.handshake.ciphersuites` 比对。
9. `from collections import Counter; H = -sum((c/len(s))*math.log2(c/len(s)) for c in Counter(s).values())`，阈值 4.5。

---

## 6.13 面试高频考点（附参考答案）

**Q1**：被动 OSINT 与主动 OSINT 边界在哪里？
- 是否对目标产生网络请求；查 CT、Wayback、Shodan 都是被动；DNS 字典爆破、端口扫描属主动。

**Q2**：CT 日志为什么是子域枚举的金矿？
- 强制公开 + 历史保存 + 含 SAN 字段，覆盖了大量私有 / 测试子域。

**Q3**：如何防止公司被 Shodan 测绘？
- 不可能完全防止；但可关闭无谓暴露端口、减少 banner 信息、对外网用 reverse proxy + 自定义 banner、定期 Shodan Monitor。

**Q4**：JA3 / JA4 指纹的应用？
- 攻击端：识别恶意 Beacon；防御端：流量画像、Bot 识别；OPSEC：让自己工具的指纹与浏览器一致。

**Q5**：为什么 Honeytoken 比传统蜜罐更"高密度"？
- 部署成本极低（一对凭据 / URL），覆盖面广（任意被攻击者翻到的位置都能告警）。

**Q6**：DGA 与 OSINT 的关系？
- DGA 域名虽是算法生成，但攻击者必须提前注册可控域；这意味着 WHOIS / Passive DNS 数据集中能找到"近似"的注册模式。

**Q7**：员工 LinkedIn 是不是必删？
- 不是，需要"对外可见但脱敏"：只显示岗位类别 + 公司公开信息，不显示具体技术栈、邮箱、上下级关系。

**Q8**：暗网 OSINT 与法律风险？
- 仅访问公开论坛多数司法辖区合法；下载 / 转售 / 使用泄露数据违法；建议通过商业威胁情报供应商间接获取。

**Q9**：trufflehog 与 gitleaks 的差异？
- trufflehog 强调"verifier"（实际调 API 验证）；gitleaks 更轻量、规则化、CI 友好；两者可叠加使用。

**Q10**：发现敏感信息泄露后，正确处置流程？
- 不公开、不传播；联系组织安全 / 法务；走 RVD / CNVD / CNA 负责任披露；保留证据链（截屏 + 时间戳，但避免下载敏感数据）。

---

## 6.14 补充：OSINT 自动化平台与流水线

### 6.14.1 reNgine

开源 recon 平台：Web UI + 多任务流水线（subdomain → port → vuln → screenshot）。
适合个人 SRC 工作流，但需注意：默认部署有 SSRF/RCE 历史漏洞，请放在隔离 VPS。

### 6.14.2 Nettacker / Spiderfoot

- **Spiderfoot**：100+ 模块的 OSINT 自动化引擎，HTTP API 友好
- **Nettacker**：偏自动化扫描

### 6.14.3 自建流水线参考架构

```
        ┌──────────────────┐
        │  调度（Airflow）  │
        └─────────┬────────┘
                  ▼
   ┌────────┬──────────┬────────┐
   │subfinder│ amass    │crt.sh  │   被动数据采集
   └─────┬──┴───────┬──┴────┬───┘
         └──────────┼───────┘
                    ▼
            ┌────────────┐
            │ dnsx 解析   │
            └─────┬──────┘
                  ▼
            ┌────────────┐
            │ httpx 探活  │
            └─────┬──────┘
                  ▼
            ┌────────────┐
            │ nuclei + 自定义模板 │
            └─────┬──────┘
                  ▼
            ┌────────────┐
            │ Postgres / Elastic │  ← 持久化 + 检索
            └─────┬──────┘
                  ▼
            ┌────────────┐
            │ Slack / 飞书告警 │
            └────────────┘
```

每日 / 每周调度，差异告警比绝对量更有价值。

### 6.14.4 ProjectDiscovery Cloud / Bevigil / Censys ASM

商业 ASM (Attack Surface Management) 平台，按域 / IP / 公司持续监测；适合大型企业蓝队。

---

## 6.15 补充：移动端 / 物联网 OSINT

### 6.15.1 移动 App 元数据

- **APK 静态信息**：`aapt dump badging app.apk` 看 versionCode、permissions、签名
- **iOS IPA**：`Info.plist` 含 Bundle ID、URL Schemes、ATS 例外
- **Web App Manifest**：`/.well-known/assetlinks.json`、`/.well-known/apple-app-site-association` 暴露关联域名 / Universal Link
- **AndroidManifest 反编译**：`apktool d app.apk` → 找暴露的 Activity、Service、ContentProvider

### 6.15.2 IoT / 嵌入式

- 设备端口指纹：Modbus 502、BACnet 47808、UPnP 1900
- 固件包检索：制造商 FTP、GitHub、Wayback、第三方下载站
- Shodan 标签：`product:"Hikvision"`、`org:"Tp-link"`
- ICS：Modbus、DNP3、IEC-104 → ICS Honeypot 项目（Conpot）

### 6.15.3 卫星 / 无人机 OSINT

- ADS-B（飞机）：<https://flightaware.com>、<https://adsbexchange.com>
- 船舶 AIS：<https://www.marinetraffic.com/>
- 卫星图：Sentinel Hub / Planet / Maxar（按购买）
- Bellingcat 大量公开案例展示了如何用以上数据交叉验证战场冲突。

---

## 6.16 补充：AI 时代的 OSINT

### 6.16.1 LLM 辅助情报关联

- 大模型的优点：跨语种摘要、命名实体识别、关系抽取
- 应用：把 1000 份新闻 / 论坛讨论 → 生成结构化时间线 + 主体清单
- 风险：LLM 幻觉，需人工二次校验关键事实

### 6.16.2 检索增强（RAG）+ OSINT 数据集

- 把 CT / Passive DNS / Shodan dump 灌进向量库
- 自然语言 query：'查找过去 3 年里 example.com 在某段时间申请的所有 SAN 包含子串的证书'

### 6.16.3 反向：用 LLM / 图像模型对抗 OSINT

- 自动化更换头像 / 文本风格，混淆 stylometry
- 反指纹浏览器（伪造 Canvas、字体）
- LLM 生成"无意义但合理"的社交内容稀释画像信号

### 6.16.4 LLM 作为社工放大器

- 攻击者用 LLM 自动生成钓鱼邮件、即时回复、声音克隆
- 蓝队需对应升级：用户教育 + 多通道身份验证

---

## 6.17 补充：合规与道德

### 6.17.1 法律边界（中国大陆视角）

- **《网络安全法》第二十七条**：禁止非法获取、出售、提供个人信息或他人网络数据
- **《数据安全法》**：跨境数据流动限制
- **《个人信息保护法》(PIPL)**：明确同意 / 最小必要 / 目的限定
- **CFAA（美国）**：未授权访问"受保护计算机"即违法
- **GDPR（欧盟）**：处理欧盟居民个人数据需合法依据

### 6.17.2 OSINT 合规自检

- 数据来源是否公开？还是绕过技术措施获取？
- 处理目的是否合理？是否最小必要？
- 是否对当事人造成可识别伤害？
- 是否在签订的 SOW / RoE 范围内？
- 跨境传输是否合规？

### 6.17.3 红队 / 蓝队的职业伦理

- "能拿到不等于该拿到"
- 留痕原则：保留授权书、操作日志、数据销毁记录
- 公开场合脱敏：演讲 / 文章不要讲具体客户细节
- "白帽子" 不是法律豁免身份

---

## 6.18 补充：构建个人 OSINT 工作笔记

### 6.18.1 命名规范

```
osint/
├── targets/
│   ├── example-com/
│   │   ├── 01_recon/
│   │   ├── 02_assets/
│   │   ├── 03_people/
│   │   ├── 04_leaks/
│   │   ├── 05_findings/
│   │   └── README.md   ← 总览（含授权书、时间窗、重要联系人）
│   └── …
├── tools/
└── methodology/
```

### 6.18.2 Notes 模板

```markdown
# Target: example.com
- 授权窗口: 2026-01-01 ~ 2026-01-31
- 联系人: alice@example.com / +86-...
- 范围: *.example.com、AWS account 1234
- 禁入: prod.payment.example.com

## 资产
| 类型 | 标识 | 来源 | 时间 |
| ---- | ---- | ---- | ---- |

## 发现
| 等级 | 标题 | 证据 | 推荐处置 |
| ---- | ---- | ---- | -------- |
```

### 6.18.3 OSINT 在历史 CVE 应急中的角色

| 事件 / CVE | OSINT 角色 |
|-----------|-----------|
| CVE-2021-44228 (Log4Shell) | Shodan / Censys 扫"vulnerable Java apps" |
| CVE-2022-22965 (Spring4Shell) | GitHub 搜可疑 dependency 配置 |
| CVE-2022-30190 (Follina) | OSINT 发现攻击者 C2 域注册模式 |
| CVE-2023-23397 (Outlook NTLM) | 邮件内网络元数据 OSINT |
| CVE-2023-44487 (HTTP/2 Rapid Reset) | OSINT 大量公网 H/2 服务测绘 |
| CVE-2024-3094 (xz-utils) | GitHub OSINT 追溯维护者关联账号 |

### 6.18.4 推荐工具栈

- 笔记：Obsidian / Logseq + Git 同步
- 截图：Flameshot + 自动 OCR
- 时间线：TimelineJS / Aeon Timeline
- 图谱：Maltego / Neo4j Bloom
- 报告：Markdown → Pandoc → PDF / Word

---

## 6.19 补充：CT 日志深入与监控实践

### 6.19.1 CT 工作机制（细化）

```
CA 签发证书 → SCT (Signed Certificate Timestamp)
   通过两种方式呈现：
   1. 证书扩展（X.509 SCT extension）
   2. TLS 握手中的 OCSP / TLS extension

浏览器（Chrome / Safari）要求 ≥ 2 个独立 Log 的 SCT
```

### 6.19.2 公开 Log 列表

- Google Argon / Xenon
- Cloudflare Nimbus
- DigiCert Yeti / Nessie
- Sectigo Sabre / Mammoth
- Let's Encrypt Oak

### 6.19.3 CT 监控工具与 API

- `crt.sh` PostgreSQL 后端，可直接 SQL 查询
- `Cert Spotter` / `Facebook CT Monitor`（被关停后由社区接管）
- 自托管：`certstream` 实时订阅 → 写规则
- 报警条件：
  - 出现非自家 CA 给自家域签发
  - 子域命名出现仿冒（typosquat）
  - 与历史模式偏差大的 SAN 数量

### 6.19.4 PoC：实时监听 CT 流并告警

```python
import certstream, re

PATTERNS = [r'login-example\.com', r'.*-example\.com', r'example\.tk']

def callback(message, context):
    if message['message_type'] != 'certificate_update':
        return
    for d in message['data']['leaf_cert']['all_domains']:
        for p in PATTERNS:
            if re.search(p, d, re.I):
                print(f"[!] Suspicious CT: {d}")

certstream.listen_for_events(callback,
    url='wss://certstream.calidog.io/')
```

可与告警渠道（Slack / 飞书 webhook）联动。

---

## 6.20 补充：互联网测绘指纹深入

### 6.20.1 favicon 哈希（mmh3 / shodan_hash）

```python
import mmh3, codecs, requests
res = requests.get('https://target/favicon.ico')
b64 = codecs.encode(res.content, 'base64')
hash_v = mmh3.hash(b64)
print(hash_v)  # 可在 Shodan / FOFA / Hunter 用 `http.favicon.hash:<hash>` 搜
```

特定后台框架 favicon 在所有部署中通常一致 → 可一键找到所有同类后台。

### 6.20.2 HTTP 指纹聚合

- `Server` 头 + `X-Powered-By` + `X-Generator`
- HTML 关键 meta tag（generator）
- `<link rel="manifest">` 指向的 manifest.json
- JS 文件名 hash（webpack chunk）
- 错误页面 banner（如 Tomcat 默认 404）

### 6.20.3 TLS 指纹（JARM / JA3S）

- **JA3** = 客户端 TLS 握手指纹
- **JA3S** = 服务端响应指纹
- **JARM** = 主动探测：用 10 个不同 Client Hello 探目标 → 拼指纹
- 应用：识别 C2（Cobalt Strike Beacon、Metasploit handler）

### 6.20.4 SSH banner / version

```bash
nc target 22 -w 3
# SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5
```

服务器版本与发行版默认包对照可推断 OS 版本（"OpenSSH 8.2p1 Ubuntu" → Ubuntu 20.04 LTS）。

---

## 6.21 延伸阅读

### 教材

- Michael Bazzell，《Open Source Intelligence Techniques (10th Ed.)》
- Nihad A. Hassan，《Open Source Intelligence Methods and Tools》
- Kevin Mitnick，《The Art of Deception》（社工经典）
- Robert Layton，《Big Data and Privacy》

### 资源 / 平台

- OSINT Framework：<https://osintframework.com/>
- Bellingcat 案例研究：<https://www.bellingcat.com/>
- Trace Labs CTF（合规 OSINT 比赛）
- IntelTechniques 训练课程
- Maltego Community Edition

### 标准 / 法律

- 《网络安全法》《数据安全法》《个人信息保护法》
- GDPR、CCPA
- ISO/IEC 27037（数字证据采集）

### 论文 / 博客

- Mandiant APT Reports（M-Trends 年度报告）
- Microsoft Threat Intelligence Center
- Cisco Talos 博客
- ProjectDiscovery 博客（recon 工程实战）
- HackTricks OSINT 章节

---

## 6.22 小结

侦察阶段的产出 = 后续所有渗透行为的 "数据底座"。做得越扎实，漏洞评估、漏洞利用阶段越省力。

**记住**：信息收集不是"多"，而是"准"与"结构化"。OSINT 的护城河在于**关联与判断力**，工具只是放大器。

### 关键收获

- **被动优先**：能通过被动渠道得到的信息，绝不主动接触目标
- **数据 → 信息 → 情报** 三步走：原始抓取 → 清洗聚合 → 关联判断
- **结构化记录**：每个目标一套笔记 + 截图 + 时间戳；可重复、可审计
- **OPSEC 永不放松**：化身、出口、设备、行为四要素一致
- **合规底线**：法律 + SOW + 道德三重约束
- **持续监控**：CT、Shodan、GitHub 是流动的数据源，定期跑差异更新

### 与其他章节的接口

- → Ch07（漏洞评估与扫描）：把 `live.txt` / `urls.txt` 喂给扫描器
- → Ch08（渗透方法论）：把 `people.csv` 用于钓鱼定制
- → Ch11（蓝队 / SOC）：CT 实时监控 + Honeytoken 是检测早期阶段攻击者侦察的关键
- → Ch12（云 / AI 安全）：云资产与移动 App 的 OSINT 思路在那里继续延伸

### 典型 anti-pattern

- 一开始就 nmap 全端口扫描 → 高频留痕被 ban
- 子域 dump 到一个文件不去重不分类 → 数据噪音淹没真情报
- 凭证泄露发现后立刻 PoC 测试 → 触发蓝队告警 + 法律风险
- LinkedIn 加好友 / 私信 → 暴露化身 + 触发目标警觉

### 推荐学习节奏

1. 第 1 周：把本章工具全装好，把自己 / 家人的公开账号画一遍像，体会信息暴露
2. 第 2 周：在 HackTheBox / TryHackMe 的 OSINT 房间练习
3. 第 3 周：参加 Trace Labs CTF 一次，学习按真实失踪人员案件做合规 OSINT
4. 第 4 周：以"自己的开源仓库 + Shodan 个人账号"为对象做一次完整 recon，写报告

完成本章后，你应当具备**给定一个域名 / 公司名，2 小时内交付一份结构化资产 + 人员 + 泄露画像**的能力。

### 复盘检查表

- [ ] 我的子域枚举工具链至少包含 3 个独立数据源
- [ ] 我能区分被动 / 主动侦察并解释其 OPSEC 后果
- [ ] 我的 OSINT 笔记结构可让其他人（队友 / 律师）快速复核
- [ ] 我能解释 CT、Passive DNS、Wayback 三者的差异和应用
- [ ] 我对至少 5 类常见敏感信息泄露场景有自动化检测能力
- [ ] 我能写出本章的 `recon.py` 全流水线脚本而无需查文档
- [ ] 我了解 PIPL / GDPR / CFAA 在 OSINT 上的红线
- [ ] 我能从攻击者视角制定一份针对自家组织的 ASM 治理计划

如全部勾上，进入 Ch07 漏洞评估与扫描；如有空缺，回到对应小节强化。
