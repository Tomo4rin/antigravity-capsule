#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Antigravity 2.0 独立主窗口常驻悬浮胶囊 Sidecar（纯 Python 标准库）。"""

import sys

sys.dont_write_bytecode = True

import argparse
import base64
import json
import os
import re
import signal
import socket
import struct
import subprocess
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from collector import PulseCollector

INJECT_PATH = ROOT / "inject.js"
AVATARS_DIR = ROOT / "avatars"
CAPSULE_VERSION = "0.2.0"


def load_inject_script():
    return INJECT_PATH.read_text(encoding="utf-8")


def load_avatar_data_uris():
    """将 4 张独立小头像转为 Data URI，避免主窗口 CSP 拦截本地端口图片。"""
    files = {
        "happy": ("happy.png", "image/png"),
        "curious": ("curious.png", "image/png"),
        "sleepy": ("sleepy.png", "image/png"),
        "smug": ("smug.jpg", "image/jpeg"),
    }
    out = {}
    for key, (fname, mime) in files.items():
        p = AVATARS_DIR / fname
        if p.is_file():
            b64 = base64.b64encode(p.read_bytes()).decode("ascii")
            out[key] = f"data:{mime};base64,{b64}"
    return out


def find_antigravity_listen_ports():
    """在 Windows 上优先从 DevToolsActivePort 读取调试端口，再用 tasklist + netstat 兜底。"""
    ports = []
    try:
        appdata = os.environ.get("APPDATA")
        if appdata:
            active_port_file = Path(appdata) / "Antigravity" / "DevToolsActivePort"
            if active_port_file.is_file():
                first_line = active_port_file.read_text(encoding="utf-8", errors="ignore").splitlines()[0].strip()
                if first_line.isdigit():
                    p = int(first_line)
                    if 0 < p <= 65535:
                        ports.append(p)
    except Exception:
        pass

    try:
        pids_raw = subprocess.check_output(
            ["tasklist", "/FI", "IMAGENAME eq Antigravity.exe", "/FO", "CSV", "/NH"],
            text=True,
            encoding="utf-8",
            errors="ignore",
        )
        pids = set()
        for line in pids_raw.splitlines():
            parts = [p.strip('"') for p in line.split(",")]
            if len(parts) >= 2 and parts[1].isdigit():
                pids.add(parts[1])
        if not pids:
            return ports

        net_raw = subprocess.check_output(
            ["netstat", "-ano", "-p", "TCP"],
            text=True,
            encoding="utf-8",
            errors="ignore",
        )
        for line in net_raw.splitlines():
            cols = line.split()
            if len(cols) >= 5 and cols[0].upper() == "TCP" and cols[3].upper() in ("LISTENING", "LISTEN", "侦听", "监听"):
                addr, pid = cols[1], cols[4]
                if pid in pids and addr.startswith("127.0.0.1:"):
                    port_str = addr.rsplit(":", 1)[-1]
                    if port_str.isdigit():
                        p = int(port_str)
                        if p not in ports:
                            ports.append(p)
    except Exception:
        pass
    return ports


def is_main_window_target(target):
    """仅挑选主桌面窗口顶层页面，排除 DevTools、iframe 与侧栏 Webview。"""
    if not isinstance(target, dict):
        return False
    if not target.get("webSocketDebuggerUrl"):
        return False
    if target.get("type") != "page":
        return False
    url = str(target.get("url") or "").strip().lower()
    if not url:
        return False
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    # 仅按路径排除侧栏插件自身的辅助页面，避免误伤主窗口的 ?tab=sidecar__... 查询参数
    path = parsed.path or ""
    if "antigravity-pulse" in path or "sidecar" in path:
        return False
    return True


def is_uuid(val):
    if not val:
        return False
    return bool(re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", str(val).strip()))


def extract_conversation_id(url):
    """从主窗口 URL 中提取当前正在浏览的对话 ID（/c/<uuid>）。"""
    if not url:
        return None
    m = re.search(r"/c/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})", str(url))
    return m.group(1) if m else None


def extract_title_hint(raw_title):
    """从窗口标题（如 'What Is A Workflow - gemini - Antigravity'）提取对话名。"""
    if not raw_title:
        return None
    s = str(raw_title).strip()
    if " - " in s:
        head = s.split(" - ", 1)[0].strip()
        if head and head.lower() not in ("antigravity", "new conversation"):
            return head
    return s if s and s.lower() not in ("antigravity", "new conversation") else None


def resolve_cid_by_title(collector, title_hint, cache):
    """当 URL 未随同工作区切换更新时，通过标题反查真实 conversationId。"""
    if not title_hint:
        return None
    if "__base__" not in cache:
        cache["__base__"] = collector.snapshot(force_quota=False)
    convs = (cache["__base__"] or {}).get("conversations") or []
    hint_low = title_hint.lower()
    for c in convs:
        ct = str(c.get("title") or "").strip().lower()
        if ct and (ct == hint_low or ct.startswith(hint_low[:24]) or hint_low.startswith(ct[:24])):
            return c.get("id")
    return None


def snapshot_for_target(collector, target, cache, hint_info=None, prefer_title=False, force_quota=False):
    """按窗口当前真实会话 ID、URL 或面包屑标题反查精准采集，并在同轮多窗口间复用结果以节省开销。"""
    active_cid = ((hint_info or {}).get("activeCid") or "").strip()
    url = (hint_info or {}).get("href") or target.get("url")
    crumb = ((hint_info or {}).get("crumbTitle") or "").strip()
    title_raw = crumb or (hint_info or {}).get("title") or target.get("title")
    cid = active_cid if is_uuid(active_cid) else extract_conversation_id(url)
    title_hint = crumb or extract_title_hint(title_raw)

    # 若尚未拿到 DOM 中的真实 UUID，且同工作区切换导致 URL 仍停在旧会话，再用标题反查新 ID
    if not is_uuid(active_cid) and (prefer_title or crumb) and title_hint:
        by_title = resolve_cid_by_title(collector, title_hint, cache)
        if by_title:
            cid = by_title

    key = cid or "__latest__"
    if key not in cache:
        snap = collector.snapshot(force_quota=force_quota, conversation_id=cid)
        if cid and isinstance(snap.get("speed"), dict) and snap["speed"].get("conversationId") != cid:
            snap = dict(snap)
            snap["speed"] = None
        cache[key] = snap

    # 二次兜底：若按 URL 拿到的标题与窗口当前标题明显不一致，尝试反查匹配
    snap = cache[key]
    cur_speed_title = ((snap.get("speed") or {}).get("title") or "").strip().lower()
    if title_hint and cur_speed_title and not (
        cur_speed_title == title_hint.lower()
        or cur_speed_title.startswith(title_hint.lower()[:20])
        or title_hint.lower().startswith(cur_speed_title[:20])
    ):
        by_title = resolve_cid_by_title(collector, title_hint, cache)
        if by_title and by_title != cid:
            cid = by_title
            if cid not in cache:
                s2 = collector.snapshot(force_quota=force_quota, conversation_id=cid)
                if isinstance(s2.get("speed"), dict) and s2["speed"].get("conversationId") != cid:
                    s2 = dict(s2)
                    s2["speed"] = None
                cache[cid] = s2
            snap = cache[cid]

    return cid, title_hint, snap


def fetch_main_targets(port, timeout=1.5):
    url = f"http://127.0.0.1:{port}/json/list"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    targets = json.loads(raw)
    if not isinstance(targets, list):
        return []
    return [t for t in targets if is_main_window_target(t)]


def discover_cdp(explicit_port=None):
    candidates = [explicit_port] if explicit_port else find_antigravity_listen_ports()
    for port in candidates:
        try:
            targets = fetch_main_targets(port)
            if targets:
                return port, targets
        except Exception:
            continue
    return None, []


class SimpleWS:
    """最小纯标准库 RFC 6455 WebSocket 客户端（仅用于本机 127.0.0.1 CDP）。"""

    def __init__(self, ws_url, timeout=4.0):
        parsed = urlparse(ws_url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 80
        path = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query

        self.sock = socket.create_connection((host, port), timeout=timeout)
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(handshake.encode("ascii"))
        buf = b""
        while b"\r\n\r\n" not in buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError("WebSocket handshake closed")
            buf += chunk
        status_line = buf.split(b"\r\n", 1)[0]
        if b"101" not in status_line:
            raise ConnectionError(f"WebSocket upgrade failed: {status_line!r}")

    def _recv_exact(self, n):
        buf = bytearray()
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("WebSocket closed unexpectedly")
            buf.extend(chunk)
        return bytes(buf)

    def send_text(self, text):
        payload = text.encode("utf-8")
        header = bytearray([0x81])
        length = len(payload)
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", length))
        mask = os.urandom(4)
        header.extend(mask)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(bytes(header) + masked)

    def recv_text(self):
        chunks = []
        while True:
            b1, b2 = self._recv_exact(2)
            fin = (b1 & 0x80) != 0
            opcode = b1 & 0x0F
            masked = (b2 & 0x80) != 0
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack("!H", self._recv_exact(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", self._recv_exact(8))[0]
            mask = self._recv_exact(4) if masked else None
            data = self._recv_exact(length) if length else b""
            if mask:
                data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            if opcode == 0x8:
                raise ConnectionError("WebSocket closed by peer")
            if opcode == 0x9:
                continue
            chunks.append(data)
            if fin:
                return b"".join(chunks).decode("utf-8", errors="replace")

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass


def cdp_eval(ws_url, expression, timeout=4.0):
    ws = SimpleWS(ws_url, timeout=timeout)
    try:
        msg = json.dumps(
            {
                "id": 1,
                "method": "Runtime.evaluate",
                "params": {"expression": expression, "returnByValue": True},
            }
        )
        ws.send_text(msg)
        while True:
            reply = json.loads(ws.recv_text())
            if reply.get("id") == 1:
                result = reply.get("result", {}).get("result", {})
                return result.get("value")
    finally:
        ws.close()


def mount_target(ws_url, inject_code, avatars_json, snapshot_json):
    expr = (
        f"(() => {{ if (window !== window.top) return {{status: 'skip_frame'}}; "
        f"if (!window.__agCapsule || window.__agCapsule.version !== '{CAPSULE_VERSION}') {{ "
        f"if (window.__agCapsule && window.__agCapsule.destroy) {{ window.__agCapsule.destroy(); }} "
        f"delete window.__agCapsule; {inject_code} }} "
        f"window.__agCapsule.mount({avatars_json}); "
        f"return window.__agCapsule.update({snapshot_json}); }})()"
    )
    return cdp_eval(ws_url, expr, timeout=5.0)


def update_target(ws_url, snapshot_json):
    expr = (
        f"(() => {{ if (window !== window.top) return {{status: 'skip_frame'}}; "
        f"if (!window.__agCapsule || window.__agCapsule.version !== '{CAPSULE_VERSION}' || !window.__agCapsule.isMounted()) "
        f"return {{status: 'need_mount'}}; "
        f"return window.__agCapsule.update({snapshot_json}); }})()"
    )
    return cdp_eval(ws_url, expr, timeout=2.5)


def get_target_hint(ws_url):
    expr = (
        f"(() => {{ if (window !== window.top) return null; "
        f"if (!window.__agCapsule || window.__agCapsule.version !== '{CAPSULE_VERSION}' || !window.__agCapsule.isMounted()) "
        f"return {{needMount: true}}; "
        f"return window.__agCapsule.hint ? window.__agCapsule.hint() : {{href: location.href, title: document.title}}; }})()"
    )
    return cdp_eval(ws_url, expr, timeout=1.5)


def remove_targets(targets):
    expr = "(() => window.__agCapsule && window.__agCapsule.destroy ? window.__agCapsule.destroy() : {status: 'not_mounted'})()"
    results = []
    for t in targets:
        title = t.get("title") or t.get("url") or t.get("id")
        try:
            res = cdp_eval(t["webSocketDebuggerUrl"], expr, timeout=1.5)
            results.append((title, res))
        except Exception as exc:
            results.append((title, {"error": str(exc)}))
    return results


def watch_loop(explicit_port=None, interval=2.0):
    running = True

    def _stop(_signum, _frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, _stop)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _stop)

    collector = PulseCollector()
    inject_code = load_inject_script()
    avatars_json = json.dumps(load_avatar_data_uris(), ensure_ascii=False)
    last_inject_mtime = INJECT_PATH.stat().st_mtime
    mounted_urls = set()
    last_target_cid = {}
    last_target_title = {}
    last_pushed_sig = {}
    last_pushed_at = {}
    active_port = explicit_port
    started_at = time.monotonic()
    warned_no_port = False

    print("antigravity-capsule Sidecar 悬浮胶囊监听已启动...", flush=True)
    while running:
        sleep_sec = interval
        try:
            cur_mtime = INJECT_PATH.stat().st_mtime
            if cur_mtime != last_inject_mtime:
                inject_code = load_inject_script()
                last_inject_mtime = cur_mtime
                mounted_urls.clear()
                last_target_cid.clear()
                last_target_title.clear()
                last_pushed_sig.clear()
                last_pushed_at.clear()
                print("检测到 inject.js 更新，准备热重载悬浮胶囊...", flush=True)

            port, cur_targets = discover_cdp(active_port)
            if not port and active_port and not explicit_port:
                active_port = None
                port, cur_targets = discover_cdp(None)

            if port and cur_targets:
                active_port = port
                warned_no_port = False
                snap_cache = {}
                now_mono = time.monotonic()

                alive_urls = set()
                all_hidden = True
                pushed_any = False
                for t in cur_targets:
                    ws_url = t["webSocketDebuggerUrl"]
                    alive_urls.add(ws_url)
                    try:
                        if ws_url not in mounted_urls:
                            cid, thint, snap = snapshot_for_target(collector, t, snap_cache, force_quota=False)
                            snap_json = json.dumps(snap, ensure_ascii=False)
                            sig = json.dumps({k: v for k, v in snap.items() if k != "serverTimeMs"}, sort_keys=True, ensure_ascii=False)
                            res = mount_target(ws_url, inject_code, avatars_json, snap_json)
                            if isinstance(res, dict) and res.get("status") in ("updated", "skip_frame"):
                                mounted_urls.add(ws_url)
                                last_target_cid[ws_url] = cid
                                last_target_title[ws_url] = thint
                                last_pushed_sig[ws_url] = sig
                                last_pushed_at[ws_url] = now_mono
                                pushed_any = True
                                if res.get("status") == "updated":
                                    if not res.get("hidden"):
                                        all_hidden = False
                                    print(f"[{t.get('title') or 'Antigravity'}] 悬浮胶囊已挂载", flush=True)
                        else:
                            hint = get_target_hint(ws_url) or {}
                            if hint.get("needMount"):
                                cid, thint, snap = snapshot_for_target(collector, t, snap_cache, force_quota=False)
                                snap_json = json.dumps(snap, ensure_ascii=False)
                                sig = json.dumps({k: v for k, v in snap.items() if k != "serverTimeMs"}, sort_keys=True, ensure_ascii=False)
                                res = mount_target(ws_url, inject_code, avatars_json, snap_json)
                                pushed_any = True
                                if isinstance(res, dict) and res.get("status") == "updated":
                                    if not res.get("hidden"):
                                        all_hidden = False
                                    print(f"[{t.get('title') or 'Antigravity'}] 页面重载，已重新挂载悬浮胶囊", flush=True)
                                last_target_cid[ws_url] = cid
                                last_target_title[ws_url] = thint
                                last_pushed_sig[ws_url] = sig
                                last_pushed_at[ws_url] = now_mono
                                continue

                            cur_thint = ((hint.get("crumbTitle") or "").strip()) or extract_title_hint(hint.get("title") or t.get("title"))
                            title_changed = bool(cur_thint and last_target_title.get(ws_url) and cur_thint != last_target_title.get(ws_url))
                            cid, thint, snap = snapshot_for_target(
                                collector,
                                t,
                                snap_cache,
                                hint_info=hint,
                                prefer_title=title_changed,
                                force_quota=False,
                            )
                            snap_json = json.dumps(snap, ensure_ascii=False)
                            sig = json.dumps({k: v for k, v in snap.items() if k != "serverTimeMs"}, sort_keys=True, ensure_ascii=False)
                            cid_changed = last_target_cid.get(ws_url) != cid

                            if not cid_changed and not title_changed and last_pushed_sig.get(ws_url) == sig and (now_mono - last_pushed_at.get(ws_url, 0.0)) < 30.0:
                                if not hint.get("hidden"):
                                    all_hidden = False
                                continue

                            res = update_target(ws_url, snap_json)
                            pushed_any = True
                            if isinstance(res, dict) and not res.get("hidden"):
                                all_hidden = False
                            last_target_cid[ws_url] = cid
                            last_target_title[ws_url] = thint
                            last_pushed_sig[ws_url] = sig
                            last_pushed_at[ws_url] = now_mono
                    except Exception:
                        mounted_urls.discard(ws_url)
                        last_target_cid.pop(ws_url, None)
                        last_target_title.pop(ws_url, None)
                        last_pushed_sig.pop(ws_url, None)
                        last_pushed_at.pop(ws_url, None)
                mounted_urls.intersection_update(alive_urls)
                if mounted_urls and all_hidden:
                    sleep_sec = 15.0
            else:
                if not warned_no_port and time.monotonic() - started_at >= 10.0:
                    warned_no_port = True
                    print(
                        "提示：暂未检测到 CDP 调试端口（请确认启动参数含 --remote-debugging-port=0 --remote-debugging-address=127.0.0.1），静默等待中。",
                        flush=True,
                    )
                sleep_sec = 5.0
        except Exception as exc:
            print(f"悬浮胶囊轮询异常: {exc}", flush=True)

        # 分片休眠，确保退出信号响应迅速
        deadline = time.monotonic() + sleep_sec
        while running and time.monotonic() < deadline:
            time.sleep(0.25)

    # 退出时干净卸载主窗口中的悬浮胶囊
    try:
        _, cur_targets = discover_cdp(active_port)
        if cur_targets:
            remove_targets(cur_targets)
    except Exception:
        pass
    print("antigravity-capsule Sidecar 已停止。", flush=True)
    return 0


def main():
    parser = argparse.ArgumentParser(description="Antigravity 星轨猫猫悬浮胶囊")
    parser.add_argument("--watch", action="store_true", help="后台常驻监听并持续推送实时指标")
    parser.add_argument("--once", action="store_true", help="单次挂载并推送一次最新指标")
    parser.add_argument("--remove", action="store_true", help="从主窗口卸载悬浮胶囊")
    parser.add_argument("--status", action="store_true", help="检查 CDP 调试端口与指标采集状态")
    parser.add_argument("--port", type=int, default=None, help="手动指定 CDP 调试端口")
    parser.add_argument("--interval", type=float, default=2.0, help="指标推送间隔秒数（默认 2.0）")
    args = parser.parse_args()

    if args.status:
        port, targets = discover_cdp(args.port)
        collector = PulseCollector()
        cid = extract_conversation_id(targets[0].get("url")) if targets else None
        snap = collector.snapshot(force_quota=True, conversation_id=cid)
        print(
            json.dumps(
                {
                    "cdpPort": port,
                    "mainTargets": [{"title": t.get("title"), "url": t.get("url")} for t in targets],
                    "collector": {
                        "connection": snap.get("connection"),
                        "groups": len(snap.get("groups") or []),
                        "model": (snap.get("speed") or {}).get("model"),
                        "tps": (snap.get("speed") or {}).get("latestTps") or (snap.get("speed") or {}).get("tps"),
                        "contextPct": round(((snap.get("speed") or {}).get("context") or {}).get("usedFraction", 0) * 100, 1)
                        if ((snap.get("speed") or {}).get("context") or {}).get("usedFraction") is not None
                        else None,
                    },
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    if args.remove:
        port, targets = discover_cdp(args.port)
        if not port or not targets:
            print("未检测到可卸载的 Antigravity 主窗口。")
            return 0
        print(json.dumps(remove_targets(targets), ensure_ascii=False, indent=2))
        return 0

    if args.once:
        port, targets = discover_cdp(args.port)
        if not port or not targets:
            print("未检测到带 CDP 调试端口的 Antigravity 主窗口。", file=sys.stderr)
            return 1
        collector = PulseCollector()
        snap_cache = {}
        inject_code = load_inject_script()
        avatars_json = json.dumps(load_avatar_data_uris(), ensure_ascii=False)
        out = []
        for t in targets:
            _, _, snap = snapshot_for_target(collector, t, snap_cache, force_quota=True)
            res = mount_target(t["webSocketDebuggerUrl"], inject_code, avatars_json, json.dumps(snap, ensure_ascii=False))
            out.append({"title": t.get("title"), "result": res})
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0

    if args.watch:
        return watch_loop(explicit_port=args.port, interval=max(1.5, args.interval))

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
