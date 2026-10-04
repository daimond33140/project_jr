"""
====================================================================
 HexSyncTH Auto Sync — Multi-Project Git Engine & Cyberpunk UI
 Author: HexSyncTH
 Function: Multi-Folder Git Watcher, GitHub Switcher & Vercel Pipeline
 Compatible with: PyInstaller Standalone .EXE
====================================================================
"""

import http.server
import socketserver
import urllib.parse
import urllib.request
import json
import subprocess
import threading
import time
import datetime
import os
import sys
import uuid
import webbrowser
import concurrent.futures
import re

# Ensure stdout and stderr are safely handled in PyInstaller windowed mode
if sys.stdout is None:
    try:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
    except Exception:
        pass
elif hasattr(sys.stdout, 'encoding') and sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

if sys.stderr is None:
    try:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")
    except Exception:
        pass
elif hasattr(sys.stderr, 'encoding') and sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Determine base directory (supporting PyInstaller bundle)
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    BUNDLE_DIR = sys._MEIPASS
    APP_DIR = os.path.dirname(sys.executable)
else:
    BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))
    APP_DIR = BUNDLE_DIR

UI_DIR = os.path.join(BUNDLE_DIR, "hexsync_ui")
CONFIG_FILE = os.path.join(APP_DIR, "hexsync_config.json")
DEFAULT_PORT = 5055

# Thread-safe State (Re-entrant Lock)
state_lock = threading.RLock()

def load_config():
    default_config = {
        "active_project_id": "proj_default",
        "projects": [
            {
                "id": "proj_default",
                "name": "Thailand Tourism Dashboard",
                "path": "C:\\project",
                "github_url": "https://github.com/daimond33140/project_jr.git",
                "branch": "main",
                "debounce": 5
            }
        ]
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "projects" in data and len(data["projects"]) > 0:
                    return data
        except Exception:
            pass
    save_config(default_config)
    return default_config

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving config: {e}")

config_data = load_config()

app_state = {
    "is_watching": True,
    "is_syncing": False,
    "pending_files": [],
    "pending_count": 0,
    "total_syncs": 0,
    "last_sync": "--:--:--",
    "port": DEFAULT_PORT,
    "debounce_percent": 0,
    "logs": []
}

last_change_detected_time = None

def get_active_project():
    with state_lock:
        active_id = config_data.get("active_project_id")
        for p in config_data.get("projects", []):
            if p["id"] == active_id:
                return p
        if config_data.get("projects"):
            return config_data["projects"][0]
        return None

def safe_print(*args, **kwargs):
    try:
        if sys.stdout is not None:
            print(*args, **kwargs)
    except Exception:
        pass

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
    safe_print(f"[{now_str}] [{level.upper()}] {message}")

def run_git_in_path(args, cwd):
    if not os.path.exists(cwd):
        return -1, "", f"Directory does not exist: {cwd}"
    try:
        startupinfo = None
        creationflags = 0
        if os.name == "nt":
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 0
            creationflags = subprocess.CREATE_NO_WINDOW

        res = subprocess.run(
            ["git"] + args,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            startupinfo=startupinfo,
            creationflags=creationflags
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return -1, "", str(e)

_vercel_cache = {}
_vercel_cache_time = {}

def check_repo_vercel(owner, repo_name):
    if not owner or not repo_name:
        return {"connected": False, "status": "NOT_CONNECTED", "url": None, "environment": None}
    cache_key = f"{owner}/{repo_name}".lower()
    now = time.time()
    if cache_key in _vercel_cache and (now - _vercel_cache_time.get(cache_key, 0)) < 60:
        return _vercel_cache[cache_key]

    result = {
        "connected": False,
        "status": "NOT_CONNECTED",
        "url": None,
        "environment": None
    }

    try:
        url = f"https://api.github.com/repos/{owner}/{repo_name}/deployments?per_page=3"
        req = urllib.request.Request(url, headers={"User-Agent": "HexSyncTH-Desktop/2.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            deps = json.loads(resp.read().decode('utf-8'))
            if deps and isinstance(deps, list) and len(deps) > 0:
                first_dep = deps[0]
                dep_id = first_dep.get("id")
                target_url = None
                if dep_id:
                    st_url = f"https://api.github.com/repos/{owner}/{repo_name}/deployments/{dep_id}/statuses?per_page=1"
                    st_req = urllib.request.Request(st_url, headers={"User-Agent": "HexSyncTH-Desktop/2.0"})
                    try:
                        with urllib.request.urlopen(st_req, timeout=2.5) as st_resp:
                            statuses = json.loads(st_resp.read().decode('utf-8'))
                            if statuses and isinstance(statuses, list) and len(statuses) > 0:
                                target_url = statuses[0].get("target_url") or statuses[0].get("environment_url")
                    except Exception:
                        pass

                if not target_url:
                    clean_slug = repo_name.lower().replace("_", "-")
                    target_url = f"https://{clean_slug}.vercel.app"

                result = {
                    "connected": True,
                    "status": "LIVE",
                    "url": target_url,
                    "environment": first_dep.get("environment", "Production")
                }
    except Exception:
        pass

    _vercel_cache[cache_key] = result
    _vercel_cache_time[cache_key] = now
    return result

def ensure_git_setup(proj):
    cwd = proj["path"]
    if not os.path.exists(cwd):
        return False, "โฟลเดอร์โปรเจกต์ไม่มีอยู่จริง"

    # Check if git is initialized
    code, _, _ = run_git_in_path(["status"], cwd)
    if code != 0:
        log_event(f"📦 โฟลเดอร์ {cwd} ยังไม่ได้ทำ Git — กำลังทำ git init...", "warn")
        c1, _, _ = run_git_in_path(["init", "-b", proj.get("branch", "main")], cwd)
        if c1 != 0:
            run_git_in_path(["init"], cwd)
            run_git_in_path(["branch", "-M", proj.get("branch", "main")], cwd)

    # Remote URL
    target_url = proj.get("github_url", "").strip()
    if target_url:
        code, out, _ = run_git_in_path(["remote", "get-url", "origin"], cwd)
        if code == 0:
            if out.strip() != target_url:
                run_git_in_path(["remote", "set-url", "origin", target_url], cwd)
                log_event(f"🔗 อัปเดต Remote URL เป็น: {target_url}", "info")
        else:
            run_git_in_path(["remote", "add", "origin", target_url], cwd)
            log_event(f"🔗 เชื่อมต่อ Remote URL: {target_url}", "info")

    return True, "OK"

def get_modified_files(cwd):
    code, out, _ = run_git_in_path(["status", "--porcelain"], cwd)
    if code != 0 or not out:
        return []
    
    files = []
    for line in out.splitlines():
        line = line.strip()
        if len(line) >= 3:
            files.append(line)
    return files

def execute_sync():
    proj = get_active_project()
    if not proj:
        log_event("❌ ไม่พบการตั้งค่าโปรเจกต์", "error")
        return False

    cwd = proj["path"]
    branch = proj.get("branch", "main")
    
    with state_lock:
        if app_state["is_syncing"]:
            return False
        app_state["is_syncing"] = True
        app_state["debounce_percent"] = 100

    log_event(f"🚀 เริ่มต้น Deploy โปรเจกต์ [{proj['name']}]...", "info")
    
    # 1. Git add
    code, _, err = run_git_in_path(["add", "-A"], cwd)
    if code != 0:
        log_event(f"❌ Git Add ผิดพลาด: {err}", "error")
        with state_lock:
            app_state["is_syncing"] = False
        return False
        
    # 2. Git commit
    now_ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = f"HexSyncTH Auto Update: {now_ts}"
    code, out, err = run_git_in_path(["commit", "-m", msg], cwd)
    
    if code != 0 and "nothing to commit" not in (out + err):
        log_event(f"❌ Git Commit ผิดพลาด: {err or out}", "error")
        with state_lock:
            app_state["is_syncing"] = False
        return False
        
    # 3. Git push
    log_event(f"📡 กำลังส่งข้อมูลไปยัง GitHub: origin/{branch} ...", "info")
    code, out, err = run_git_in_path(["push", "-u", "origin", branch], cwd)
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
    log_event("🛡️ HexSyncTH Multi-Project Engine พร้อมทำงาน", "success")

    while True:
        try:
            proj = get_active_project()
            if not proj:
                time.sleep(2.0)
                continue

            cwd = proj.get("path", "")
            debounce_sec = float(proj.get("debounce", 5))

            with state_lock:
                watching = app_state["is_watching"]
                syncing = app_state["is_syncing"]

            if watching and not syncing and os.path.exists(cwd):
                files = get_modified_files(cwd)
                with state_lock:
                    app_state["pending_files"] = files
                    app_state["pending_count"] = len(files)

                if files:
                    if last_change_detected_time is None:
                        last_change_detected_time = time.time()
                        log_event(f"👀 ตรวจพบไฟล์แก้ไขใน [{proj['name']}] {len(files)} ไฟล์ — รอ {int(debounce_sec)} วิ...", "warn")

                    elapsed = time.time() - last_change_detected_time
                    progress = min(100, int((elapsed / debounce_sec) * 100))
                    with state_lock:
                        app_state["debounce_percent"] = progress

                    if elapsed >= debounce_sec:
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
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()

            proj = get_active_project() or {}
            clean_repo = ""
            if proj.get("github_url"):
                clean_repo = proj["github_url"].replace(".git", "").split("github.com/")[-1]

            active_vercel = None
            if clean_repo and "/" in clean_repo:
                parts = clean_repo.split("/")
                active_vercel = check_repo_vercel(parts[0], parts[1])

            with state_lock:
                payload = {
                    **app_state,
                    "active_project_id": config_data.get("active_project_id"),
                    "active_path": proj.get("path", ""),
                    "project_name": proj.get("name", "Unnamed"),
                    "github_url": proj.get("github_url", ""),
                    "repo_name": clean_repo,
                    "branch": proj.get("branch", "main"),
                    "debounce_seconds": proj.get("debounce", 5),
                    "projects": config_data.get("projects", []),
                    "vercel_info": active_vercel,
                    "vercel_url": active_vercel.get("url") if active_vercel else None,
                    "vercel_connected": active_vercel.get("connected", False) if active_vercel else False
                }
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))

        elif parsed.path == "/api/github_repos":
            query = urllib.parse.parse_qs(parsed.query)
            username = query.get("username", ["daimond33140"])[0].strip()
            if not username:
                username = "daimond33140"
            try:
                url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=100"
                req = urllib.request.Request(url, headers={"User-Agent": "HexSyncTH-Desktop/2.0"})
                with urllib.request.urlopen(req, timeout=12) as response:
                    raw_data = response.read().decode("utf-8")
                    repos_json = json.loads(raw_data)

                    # Concurrently check Vercel status for top repos
                    vercel_map = {}
                    repos_to_check = [r.get("name") for r in repos_json[:20] if r.get("name")]
                    try:
                        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
                            future_to_repo = {
                                executor.submit(check_repo_vercel, username, r_name): r_name
                                for r_name in repos_to_check
                            }
                            for future in concurrent.futures.as_completed(future_to_repo, timeout=5.0):
                                r_name = future_to_repo[future]
                                try:
                                    vercel_map[r_name] = future.result()
                                except Exception:
                                    vercel_map[r_name] = {"connected": False, "status": "NOT_CONNECTED", "url": None}
                    except Exception:
                        pass

                    clean_repos = []
                    for r in repos_json:
                        r_name = r.get("name", "")
                        v_info = vercel_map.get(r_name, {"connected": False, "status": "NOT_CONNECTED", "url": None})
                        clean_repos.append({
                            "name": r_name,
                            "full_name": r.get("full_name"),
                            "html_url": r.get("html_url"),
                            "clone_url": r.get("clone_url"),
                            "description": r.get("description") or "ไม่มีคำอธิบาย",
                            "default_branch": r.get("default_branch") or "main",
                            "language": r.get("language") or "General",
                            "stars": r.get("stargazers_count", 0),
                            "updated_at": r.get("updated_at", "")[:10],
                            "vercel_connected": v_info.get("connected", False),
                            "vercel_status": v_info.get("status", "NOT_CONNECTED"),
                            "vercel_url": v_info.get("url"),
                            "vercel_import_url": f"https://vercel.com/new/import?s=https://github.com/{username}/{r_name}"
                        })
                    self._send_json({"success": True, "username": username, "repos": clean_repos})
            except Exception as e:
                self._send_json({"success": False, "error": str(e), "repos": []})

        elif parsed.path == "/api/config":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            with state_lock:
                active_proj = get_active_project()
                payload = {
                    "active_project_id": config_data.get("active_project_id"),
                    "active_project": active_proj,
                    "projects": config_data.get("projects", [])
                }
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length) if length > 0 else b'{}'
        req_data = {}
        try:
            req_data = json.loads(body.decode('utf-8'))
        except Exception:
            pass

        if parsed.path == "/api/sync":
            threading.Thread(target=execute_sync).start()
            self._send_json({"success": True, "message": "Sync started"})

        elif parsed.path == "/api/toggle":
            with state_lock:
                app_state["is_watching"] = not app_state["is_watching"]
                current = app_state["is_watching"]
            status_text = "กลับมาเฝ้าดูตามปกติ" if current else "หยุดพักการเฝ้าดูชั่วคราว"
            log_event(f"⚙️ สถานะ Watcher: {status_text}", "info")
            self._send_json({"is_watching": current})

        elif parsed.path == "/api/browse_folder":
            folder = select_folder_dialog()
            detected_remote = ""
            if folder and os.path.exists(folder):
                code, out, _ = run_git_in_path(["remote", "get-url", "origin"], folder)
                if code == 0 and out:
                    detected_remote = out.strip()
            self._send_json({"path": folder or "", "detected_remote": detected_remote})

        elif parsed.path == "/api/save_project":
            p_name = req_data.get("name", "").strip()
            p_path = req_data.get("path", "").strip()
            p_github = req_data.get("github_url", "").strip()
            p_branch = req_data.get("branch", "main").strip()
            p_debounce = int(req_data.get("debounce", 5))

            if not os.path.exists(p_path):
                self._send_json({"success": False, "error": f"Folder does not exist: {p_path}"})
                return

            with state_lock:
                # Find existing or create new
                existing = None
                for p in config_data.get("projects", []):
                    if p["path"].lower() == p_path.lower():
                        existing = p
                        break
                
                if existing:
                    existing["name"] = p_name
                    existing["github_url"] = p_github
                    existing["branch"] = p_branch
                    existing["debounce"] = p_debounce
                    active_id = existing["id"]
                else:
                    new_id = f"proj_{uuid.uuid4().hex[:8]}"
                    new_item = {
                        "id": new_id,
                        "name": p_name,
                        "path": p_path,
                        "github_url": p_github,
                        "branch": p_branch,
                        "debounce": p_debounce
                    }
                    config_data["projects"].append(new_item)
                    active_id = new_id

                config_data["active_project_id"] = active_id
                save_config(config_data)

            # Ensure git remote setup
            proj = get_active_project()
            ensure_git_setup(proj)
            log_event(f"✨ บันทึกและเชื่อมต่อโปรเจกต์: {p_name} ({p_path}) เรียบร้อย", "success")
            self._send_json({"success": True})

        elif parsed.path == "/api/switch_project":
            proj_id = req_data.get("project_id")
            with state_lock:
                config_data["active_project_id"] = proj_id
                save_config(config_data)
                app_state["pending_files"] = []
                app_state["pending_count"] = 0
                app_state["debounce_percent"] = 0

            proj = get_active_project()
            if proj:
                ensure_git_setup(proj)
                log_event(f"🔄 สลับโปรเจกต์เป็น: [{proj['name']}] ({proj['path']})", "info")
            self._send_json({"success": True})

        elif parsed.path == "/api/set_repo_for_project":
            repo_url = req_data.get("repo_url", "").strip()
            branch = req_data.get("branch", "main").strip()
            proj = get_active_project()
            if proj and repo_url:
                with state_lock:
                    proj["github_url"] = repo_url
                    proj["branch"] = branch
                    save_config(config_data)
                ensure_git_setup(proj)
                log_event(f"🔗 สลับ Remote ไปที่: {repo_url} [{branch}] เรียบร้อย", "success")
                self._send_json({"success": True})
            else:
                self._send_json({"success": False, "error": "Invalid project or URL"})

        elif parsed.path == "/api/delete_project":
            proj_id = req_data.get("project_id")
            with state_lock:
                config_data["projects"] = [p for p in config_data["projects"] if p["id"] != proj_id]
                if config_data.get("active_project_id") == proj_id and config_data["projects"]:
                    config_data["active_project_id"] = config_data["projects"][0]["id"]
                save_config(config_data)
            self._send_json({"success": True})

        elif parsed.path == "/api/open_browser":
            target = req_data.get("url", "").strip()
            if target:
                try:
                    webbrowser.open(target)
                    log_event(f"🌐 เปิดเว็บเบราว์เซอร์: {target}", "info")
                    self._send_json({"success": True, "url": target})
                except Exception as e:
                    self._send_json({"success": False, "error": str(e)})
            else:
                self._send_json({"success": False, "error": "No URL provided"})

        else:
            self.send_response(404)
            self.end_headers()

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

def select_folder_dialog():
    result = []
    def ask():
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            folder_selected = filedialog.askdirectory(title="เลือกโฟลเดอร์โปรเจกต์สำหรับ HexSyncTH")
            root.destroy()
            if folder_selected:
                result.append(os.path.abspath(folder_selected))
        except Exception as e:
            print("Dialog error:", e)
    
    t = threading.Thread(target=ask)
    t.start()
    t.join(timeout=30)
    return result[0] if result else None

class WindowApi:
    def __init__(self):
        self._window = None
        self._is_max = False

    def set_window(self, win):
        self._window = win

    def minimize(self):
        if self._window:
            self._window.minimize()

    def toggle_maximize(self):
        if self._window:
            try:
                if self._is_max:
                    self._window.restore()
                    self._is_max = False
                else:
                    self._window.maximize()
                    self._is_max = True
            except Exception:
                try:
                    self._window.toggle_fullscreen()
                except Exception:
                    pass

    def close(self):
        if self._window:
            try:
                self._window.destroy()
            except Exception:
                pass
        os._exit(0)

def main():
    # Setup initial project git
    init_proj = get_active_project()
    if init_proj:
        ensure_git_setup(init_proj)

    watcher_thread = threading.Thread(target=background_watcher, daemon=True)
    watcher_thread.start()

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
        safe_print("❌ ไม่สามารถเปิด Local Server ได้")
        sys.exit(1)

    with state_lock:
        app_state["port"] = port

    app_url = f"http://127.0.0.1:{port}"

    # Start server in background thread
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    # Launch Native Frameless Desktop Window via pywebview
    try:
        import webview
        api = WindowApi()
        window = webview.create_window(
            title="HexSyncTH Cyberpunk Auto Sync",
            url=app_url,
            width=1220,
            height=820,
            min_size=(980, 650),
            frameless=True,
            easy_drag=True,
            js_api=api,
            background_color="#070709",
            text_select=False,
            zoomable=False
        )
        api.set_window(window)
        webview.start(private_mode=False)
    except Exception as e:
        safe_print(f"pywebview failed: {e}")
        webbrowser.open(app_url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    finally:
        try:
            server.shutdown()
            server.server_close()
        except Exception:
            pass
        os._exit(0)

if __name__ == "__main__":
    main()

