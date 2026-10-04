"""
====================================================================
 HexSyncTH Auto Sync — Next-Gen Black & Red Cyberpunk GUI
 Author: HexSyncTH
 Function: Real-time Git Watcher & Vercel Continuous Deployment Engine
====================================================================
"""

import http.server
import socketserver
import urllib.parse
import json
import subprocess
import threading
import time
import datetime
import os
import sys
import webbrowser

# Set UTF-8 encoding for Windows terminal
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
UI_DIR = os.path.join(PROJECT_DIR, "hexsync_ui")
DEFAULT_PORT = 5055

# Global Shared State
state_lock = threading.Lock()
app_state = {
    "is_watching": True,
    "is_syncing": False,
    "pending_files": [],
    "pending_count": 0,
    "total_syncs": 0,
    "last_sync": "--:--:--",
    "repo_name": "daimond33140/project_jr",
    "branch": "main",
    "port": DEFAULT_PORT,
    "debounce_percent": 0,
    "logs": []
}

last_change_detected_time = None
DEBOUNCE_TIME = 5.0  # seconds

def log_event(message, level="info"):
    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    with state_lock:
        app_state["logs"].append({
            "time": now_str,
            "message": message,
            "level": level
        })
        if len(app_state["logs"]) > 200:
            app_state["logs"] = app_state["logs"][-200:]
    print(f"[{now_str}] [{level.upper()}] {message}")

def run_git(args):
    try:
        res = subprocess.run(
            ["git"] + args,
            cwd=PROJECT_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return -1, "", str(e)

def detect_repo_info():
    code, out, _ = run_git(["remote", "get-url", "origin"])
    if code == 0 and out:
        # e.g. https://github.com/daimond33140/project_jr.git
        clean_name = out.replace(".git", "").split("github.com/")[-1]
        with state_lock:
            app_state["repo_name"] = clean_name
            
    code, out, _ = run_git(["branch", "--show-current"])
    if code == 0 and out:
        with state_lock:
            app_state["branch"] = out

def get_modified_files():
    code, out, _ = run_git(["status", "--porcelain"])
    if code != 0 or not out:
        return []
    
    files = []
    for line in out.splitlines():
        line = line.strip()
        if len(line) >= 3:
            # line looks like: ' M style.css' or '?? newfile.txt'
            files.append(line)
    return files

def execute_sync():
    with state_lock:
        if app_state["is_syncing"]:
            return False
        app_state["is_syncing"] = True
        app_state["debounce_percent"] = 100

    log_event("🚀 กำลังเริ่มต้นกระบวนการ Deploy ไปยัง GitHub + Vercel...", "info")
    
    # Git add
    code, _, err = run_git(["add", "-A"])
    if code != 0:
        log_event(f"❌ Git Add ผิดพลาด: {err}", "error")
        with state_lock:
            app_state["is_syncing"] = False
        return False
        
    # Git commit
    now_ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = f"HexSyncTH Auto Update: {now_ts}"
    code, out, err = run_git(["commit", "-m", msg])
    
    # Check if empty commit
    if code != 0 and "nothing to commit" not in (out + err):
        log_event(f"❌ Git Commit ผิดพลาด: {err or out}", "error")
        with state_lock:
            app_state["is_syncing"] = False
        return False
        
    # Git push
    log_event("📡 กำลังส่งข้อมูลไปยัง GitHub: origin/main ...", "info")
    code, out, err = run_git(["push", "origin", "main"])
    if code == 0:
        time_str = datetime.datetime.now().strftime("%H:%M:%S")
        log_event(f"✨ สำเร็จ! โค้ดขึ้น GitHub แล้ว Vercel เริ่มต้นอัปเดตหน้าเว็บจริงทันที", "success")
        with state_lock:
            app_state["last_sync"] = time_str
            app_state["total_syncs"] += 1
            app_state["is_syncing"] = False
            app_state["debounce_percent"] = 0
            app_state["pending_files"] = []
            app_state["pending_count"] = 0
        return True
    else:
        log_event(f"⚠️ Push ไม่สำเร็จ: {err or out}", "error")
        with state_lock:
            app_state["is_syncing"] = False
            app_state["debounce_percent"] = 0
        return False

def background_watcher():
    global last_change_detected_time
    detect_repo_info()
    log_event("🛡️ ระบบ HexSyncTH Core Engine พร้อมทำงานเรียบร้อย", "success")

    while True:
        try:
            with state_lock:
                watching = app_state["is_watching"]
                syncing = app_state["is_syncing"]

            if watching and not syncing:
                files = get_modified_files()
                with state_lock:
                    app_state["pending_files"] = files
                    app_state["pending_count"] = len(files)

                if files:
                    if last_change_detected_time is None:
                        last_change_detected_time = time.time()
                        log_event(f"👀 ตรวจพบการแก้ไข {len(files)} รายการ — หน่วงเวลา {int(DEBOUNCE_TIME)} วิ...", "warn")

                    elapsed = time.time() - last_change_detected_time
                    progress = min(100, int((elapsed / DEBOUNCE_TIME) * 100))
                    with state_lock:
                        app_state["debounce_percent"] = progress

                    if elapsed >= DEBOUNCE_TIME:
                        execute_sync()
                        last_change_detected_time = None
                else:
                    last_change_detected_time = None
                    with state_lock:
                        app_state["debounce_percent"] = 0
            else:
                last_change_detected_time = None
                with state_lock:
                    app_state["debounce_percent"] = 0

            time.sleep(1.0)
        except Exception as e:
            time.sleep(2.0)

# HTTP Request Handler
class HexSyncHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=UI_DIR, **kwargs)

    def log_message(self, format, *args):
        # Suppress standard http server access logs in terminal
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            with state_lock:
                data = json.dumps(app_state)
            self.wfile.write(data.encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/sync":
            threading.Thread(target=execute_sync).start()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Sync triggered"}).encode('utf-8'))

        elif parsed.path == "/api/toggle":
            with state_lock:
                app_state["is_watching"] = not app_state["is_watching"]
                current = app_state["is_watching"]
            status_text = "กลับมาเฝ้าดูตามปกติ" if current else "หยุดพักการเฝ้าดูชั่วคราว"
            log_event(f"⚙️ เปลี่ยนสถานะ Watcher: {status_text}", "info")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"is_watching": current}).encode('utf-8'))

        else:
            self.send_response(404)
            self.end_headers()

def open_app_window(url):
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe")
    ]
    for p in edge_paths:
        if os.path.exists(p):
            try:
                # Launch in standalone App Window Mode with custom size
                subprocess.Popen([p, f"--app={url}", "--window-size=1080,760", "--window-position=120,80"])
                return
            except Exception:
                pass
    webbrowser.open(url)

def main():
    # Start git watcher thread
    watcher_thread = threading.Thread(target=background_watcher, daemon=True)
    watcher_thread.start()

    # Find open port
    port = DEFAULT_PORT
    server = None
    for p in range(DEFAULT_PORT, DEFAULT_PORT + 20):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            server = socketserver.TCPServer(("127.0.0.1", p), HexSyncHandler)
            port = p
            break
        except OSError:
            continue

    if not server:
        print("❌ ไม่สามารถเปิด Local Server ได้")
        sys.exit(1)

    with state_lock:
        app_state["port"] = port

    app_url = f"http://127.0.0.1:{port}"
    print("=" * 65)
    print(f" 🚀 HexSyncTH Auto Sync Engine — Running on {app_url}")
    print("=" * 65)

    # Launch desktop UI
    threading.Timer(0.8, lambda: open_app_window(app_url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 ปิดโปรแกรม HexSyncTH เรียบร้อยแล้ว")
        server.server_close()

if __name__ == "__main__":
    main()
