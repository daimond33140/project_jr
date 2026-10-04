"""
====================================================================
 HexSyncTH Auto Sync — Standalone Native Desktop Application
 Architecture: Pure Native Windows GUI (CustomTkinter)
 No Browser, No Command Prompt, 100% Native Desktop Software
====================================================================
"""

import os
import sys
import json
import time
import datetime
import threading
import subprocess
import webbrowser
import queue
import tkinter as tk
from tkinter import filedialog, messagebox

# Ensure stdout and stderr don't crash when running as pythonw / noconsole exe
if sys.stdout is None:
    try:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
    except Exception:
        pass
if sys.stderr is None:
    try:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")
    except Exception:
        pass

import customtkinter as ctk

# App directory configuration
if getattr(sys, "frozen", False):
    APP_DIR = os.path.dirname(sys.executable)
else:
    APP_DIR = os.path.dirname(os.path.abspath(__file__))

CONFIG_FILE = os.path.join(APP_DIR, "hexsync_config.json")

# State & Locks
state_lock = threading.RLock()
log_queue = queue.Queue()

# --- Config Management ---
def load_config():
    default_config = {
        "active_project_id": "proj_default",
        "projects": [
            {
                "id": "proj_default",
                "name": "Thailand Tourism Dashboard",
                "path": os.path.abspath(APP_DIR),
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

# App Runtime State
app_state = {
    "is_watching": True,
    "is_syncing": False,
    "pending_files": [],
    "pending_count": 0,
    "total_syncs": 0,
    "last_sync": "--:--:--",
    "debounce_percent": 0.0,
    "status_message": "พร้อมทำงาน (Armed & Watching)"
}

last_change_detected_time = None
stop_event = threading.Event()

def get_active_project():
    with state_lock:
        active_id = config_data.get("active_project_id")
        for p in config_data.get("projects", []):
            if p["id"] == active_id:
                return p
        if config_data.get("projects"):
            return config_data["projects"][0]
        return None

def log_event(message, level="info"):
    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    log_queue.put({"time": now_str, "message": message, "level": level})

def run_git(args, cwd):
    if not os.path.exists(cwd):
        return -1, "", f"Directory does not exist: {cwd}"
    try:
        startupinfo = None
        if os.name == "nt":
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 0
            
        res = subprocess.run(
            ["git"] + args,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            startupinfo=startupinfo,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return -1, "", str(e)

def ensure_git_setup(proj):
    cwd = proj["path"]
    if not os.path.exists(cwd):
        return False, "โฟลเดอร์โปรเจกต์ไม่มีอยู่จริง"

    code, _, _ = run_git(["status"], cwd)
    if code != 0:
        log_event(f"📦 โฟลเดอร์ {cwd} ยังไม่ได้ทำ Git — กำลังทำ git init...", "warn")
        c1, _, _ = run_git(["init", "-b", proj.get("branch", "main")], cwd)
        if c1 != 0:
            run_git(["init"], cwd)
            run_git(["branch", "-M", proj.get("branch", "main")], cwd)

    target_url = proj.get("github_url", "").strip()
    if target_url:
        code, out, _ = run_git(["remote", "get-url", "origin"], cwd)
        if code == 0:
            if out.strip() != target_url:
                run_git(["remote", "set-url", "origin", target_url], cwd)
                log_event(f"🔗 อัปเดต Remote URL เป็น: {target_url}", "info")
        else:
            run_git(["remote", "add", "origin", target_url], cwd)
            log_event(f"🔗 เชื่อมต่อ Remote URL: {target_url}", "info")

    return True, "OK"

def get_modified_files(cwd):
    code, out, _ = run_git(["status", "--porcelain"], cwd)
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
        app_state["status_message"] = "กำลังซิงค์ขึ้น GitHub..."

    log_event(f"🚀 เริ่มต้น Deploy โปรเจกต์ [{proj['name']}]...", "info")

    # 1. git add
    code, _, err = run_git(["add", "-A"], cwd)
    if code != 0:
        log_event(f"❌ Git Add ผิดพลาด: {err}", "error")
        with state_lock:
            app_state["is_syncing"] = False
            app_state["status_message"] = "Git Add ผิดพลาด"
        return False

    # 2. git commit
    now_ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = f"HexSyncTH Auto Update: {now_ts}"
    code, out, err = run_git(["commit", "-m", msg], cwd)
    if code != 0 and "nothing to commit" not in (out + err):
        log_event(f"❌ Git Commit ผิดพลาด: {err or out}", "error")
        with state_lock:
            app_state["is_syncing"] = False
            app_state["status_message"] = "Git Commit ผิดพลาด"
        return False

    # 3. git push
    log_event(f"📡 กำลังส่งข้อมูลไปยัง GitHub: origin/{branch} ...", "info")
    code, out, err = run_git(["push", "-u", "origin", branch], cwd)

    if code == 0:
        time_str = datetime.datetime.now().strftime("%H:%M:%S")
        log_event(f"✨ สำเร็จ! โค้ดส่งขึ้น GitHub แล้ว (Vercel เริ่มสร้างหน้าเว็บทันที)", "success")
        try:
            import winsound
            winsound.MessageBeep(winsound.MB_OK)
        except Exception:
            pass

        with state_lock:
            app_state["last_sync"] = time_str
            app_state["total_syncs"] += 1
            app_state["is_syncing"] = False
            app_state["debounce_percent"] = 0.0
            app_state["pending_files"] = []
            app_state["pending_count"] = 0
            app_state["status_message"] = "ซิงค์สำเร็จล่าสุด: " + time_str
        return True
    else:
        log_event(f"⚠️ Push ไม่สำเร็จ: {err or out}", "error")
        with state_lock:
            app_state["is_syncing"] = False
            app_state["debounce_percent"] = 0.0
            app_state["status_message"] = "Push ล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ต/สิทธิ์"
        return False

def background_watcher():
    global last_change_detected_time
    log_event("🛡️ HexSyncTH Auto Sync Engine พร้อมทำงาน", "success")

    while not stop_event.is_set():
        try:
            proj = get_active_project()
            if not proj:
                time.sleep(1.0)
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
                        log_event(f"👀 ตรวจพบไฟล์แก้ไขใน [{proj['name']}] {len(files)} ไฟล์ — รอ {int(debounce_sec)} วินาที...", "warn")

                    elapsed = time.time() - last_change_detected_time
                    progress = min(1.0, elapsed / debounce_sec)
                    rem_sec = max(0, int(debounce_sec - elapsed))

                    with state_lock:
                        app_state["debounce_percent"] = progress
                        app_state["status_message"] = f"กำลังนับถอยหลังซิงค์อัตโนมัติ ({rem_sec}s)..."

                    if elapsed >= debounce_sec:
                        execute_sync()
                        last_change_detected_time = None
                else:
                    last_change_detected_time = None
                    with state_lock:
                        app_state["debounce_percent"] = 0.0
                        if not app_state["is_syncing"]:
                            app_state["status_message"] = "กำลังเฝ้าติดตามไฟล์ (Armed & Watching)"
            else:
                last_change_detected_time = None
                with state_lock:
                    app_state["debounce_percent"] = 0.0
                    if not watching:
                        app_state["status_message"] = "หยุดติดตามชั่วคราว (Paused)"

            time.sleep(0.5)
        except Exception:
            time.sleep(1.0)

# ====================================================================
#  GUI Interface (CustomTkinter)
# ====================================================================

class ManageProjectsDialog(ctk.CTkToplevel):
    def __init__(self, parent, on_update_callback):
        super().__init__(parent)
        self.title("⚙️ จัดการโปรเจกต์ & GitHub Configuration")
        self.geometry("720x560")
        self.minsize(650, 480)
        self.on_update_callback = on_update_callback
        self.transient(parent)
        self.grab_set()

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        hdr = ctk.CTkFrame(self, fg_color="#1e222d", corner_radius=0)
        hdr.grid(row=0, column=0, sticky="ew", padx=0, pady=0)
        ctk.CTkLabel(
            hdr, 
            text="📁 จัดการโปรเจกต์ (Multi-Project Manager)", 
            font=ctk.CTkFont(family="Segoe UI", size=17, weight="bold")
        ).pack(side="left", padx=16, pady=12)

        # Main List + Form
        body = ctk.CTkFrame(self, fg_color="transparent")
        body.grid(row=1, column=0, sticky="nsew", padx=16, pady=12)
        body.grid_columnconfigure(0, weight=1)
        body.grid_rowconfigure(0, weight=1)

        self.proj_scroll = ctk.CTkScrollableFrame(body, label_text="รายการโปรเจกต์ที่บันทึกไว้", fg_color="#161922")
        self.proj_scroll.grid(row=0, column=0, sticky="nsew", padx=0, pady=(0, 10))

        # Add / Edit Section
        edit_box = ctk.CTkFrame(body, fg_color="#1a1d26", corner_radius=8)
        edit_box.grid(row=1, column=0, sticky="ew", padx=0, pady=0)
        edit_box.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(edit_box, text="ชื่อโปรเจกต์:", font=ctk.CTkFont(size=12, weight="bold")).grid(row=0, column=0, padx=10, pady=6, sticky="w")
        self.ent_name = ctk.CTkEntry(edit_box, placeholder_text="เช่น Thailand Tourism Dashboard")
        self.ent_name.grid(row=0, column=1, columnspan=2, padx=10, pady=6, sticky="ew")

        ctk.CTkLabel(edit_box, text="โฟลเดอร์ (Path):", font=ctk.CTkFont(size=12, weight="bold")).grid(row=1, column=0, padx=10, pady=6, sticky="w")
        self.ent_path = ctk.CTkEntry(edit_box, placeholder_text="C:\\project")
        self.ent_path.grid(row=1, column=1, padx=(10, 5), pady=6, sticky="ew")
        ctk.CTkButton(edit_box, text="เลือกโฟลเดอร์...", width=110, command=self.browse_folder).grid(row=1, column=2, padx=(0, 10), pady=6)

        ctk.CTkLabel(edit_box, text="GitHub Repo URL:", font=ctk.CTkFont(size=12, weight="bold")).grid(row=2, column=0, padx=10, pady=6, sticky="w")
        self.ent_repo = ctk.CTkEntry(edit_box, placeholder_text="https://github.com/user/repo.git")
        self.ent_repo.grid(row=2, column=1, columnspan=2, padx=10, pady=6, sticky="ew")

        ctk.CTkLabel(edit_box, text="Branch / Debounce:", font=ctk.CTkFont(size=12, weight="bold")).grid(row=3, column=0, padx=10, pady=6, sticky="w")
        sub_row = ctk.CTkFrame(edit_box, fg_color="transparent")
        sub_row.grid(row=3, column=1, columnspan=2, padx=10, pady=6, sticky="w")
        self.ent_branch = ctk.CTkEntry(sub_row, width=120, placeholder_text="main")
        self.ent_branch.insert(0, "main")
        self.ent_branch.pack(side="left", padx=(0, 10))
        ctk.CTkLabel(sub_row, text="ดีเลย์ (วินาที):").pack(side="left", padx=(0, 5))
        self.ent_debounce = ctk.CTkEntry(sub_row, width=60, placeholder_text="5")
        self.ent_debounce.insert(0, "5")
        self.ent_debounce.pack(side="left")

        btn_row = ctk.CTkFrame(edit_box, fg_color="transparent")
        btn_row.grid(row=4, column=0, columnspan=3, padx=10, pady=10, sticky="e")
        ctk.CTkButton(btn_row, text="➕ เพิ่มโปรเจกต์ใหม่", fg_color="#238636", hover_color="#2ea043", command=self.add_project).pack(side="right", padx=5)

        self.refresh_list()

    def browse_folder(self):
        f = filedialog.askdirectory(title="เลือกโฟลเดอร์โปรเจกต์")
        if f:
            self.ent_path.delete(0, "end")
            self.ent_path.insert(0, os.path.normpath(f))

    def refresh_list(self):
        for w in self.proj_scroll.winfo_children():
            w.destroy()

        projects = config_data.get("projects", [])
        active_id = config_data.get("active_project_id")

        for p in projects:
            is_active = (p["id"] == active_id)
            card = ctk.CTkFrame(self.proj_scroll, fg_color="#212530" if not is_active else "#1c2e42", corner_radius=6)
            card.pack(fill="x", pady=4, padx=4)

            info = ctk.CTkFrame(card, fg_color="transparent")
            info.pack(side="left", fill="both", expand=True, padx=10, pady=8)

            t_text = p.get("name", "Unnamed")
            if is_active:
                t_text += "  [ กำลังใช้งาน ★ ]"
            ctk.CTkLabel(info, text=t_text, font=ctk.CTkFont(size=13, weight="bold"), text_color="#58a6ff" if is_active else "#f0f6fc").pack(anchor="w")
            ctk.CTkLabel(info, text=f"📂 {p.get('path')}   |   Branch: {p.get('branch', 'main')}", font=ctk.CTkFont(size=11), text_color="#8b949e").pack(anchor="w")
            ctk.CTkLabel(info, text=f"🔗 {p.get('github_url', '-')}", font=ctk.CTkFont(size=11), text_color="#6e7681").pack(anchor="w")

            act = ctk.CTkFrame(card, fg_color="transparent")
            act.pack(side="right", padx=10, pady=8)

            if not is_active:
                ctk.CTkButton(
                    act, text="เลือกใช้งาน", width=90, fg_color="#1f6feb", hover_color="#388bfd",
                    command=lambda pid=p["id"]: self.set_active(pid)
                ).pack(side="top", pady=2)
            
            if len(projects) > 1:
                ctk.CTkButton(
                    act, text="ลบ", width=90, fg_color="#da3633", hover_color="#f85149",
                    command=lambda pid=p["id"]: self.delete_project(pid)
                ).pack(side="top", pady=2)

    def set_active(self, pid):
        with state_lock:
            config_data["active_project_id"] = pid
            save_config(config_data)
        proj = get_active_project()
        if proj:
            threading.Thread(target=ensure_git_setup, args=(proj,), daemon=True).start()
            log_event(f"🔄 สลับโปรเจกต์ไปที่: [{proj['name']}]", "info")
        self.refresh_list()
        self.on_update_callback()

    def delete_project(self, pid):
        if messagebox.askyesno("ยืนยัน", "ต้องการลบโปรเจกต์นี้ออกจากการติดตามหรือไม่?"):
            with state_lock:
                config_data["projects"] = [p for p in config_data["projects"] if p["id"] != pid]
                if config_data.get("active_project_id") == pid and config_data["projects"]:
                    config_data["active_project_id"] = config_data["projects"][0]["id"]
                save_config(config_data)
            self.refresh_list()
            self.on_update_callback()

    def add_project(self):
        name = self.ent_name.get().strip()
        path = self.ent_path.get().strip()
        repo = self.ent_repo.get().strip()
        branch = self.ent_branch.get().strip() or "main"
        try:
            deb = float(self.ent_debounce.get().strip() or 5)
        except ValueError:
            deb = 5

        if not name or not path:
            messagebox.showwarning("ข้อมูลไม่ครบ", "กรุณากรอกชื่อโปรเจกต์และโฟลเดอร์")
            return
        if not os.path.exists(path):
            messagebox.showwarning("ไม่พบโฟลเดอร์", "โฟลเดอร์ที่ระบุไม่มีอยู่จริง กรุณาตรวจสอบ")
            return

        import uuid
        new_id = f"proj_{uuid.uuid4().hex[:8]}"
        new_proj = {
            "id": new_id,
            "name": name,
            "path": path,
            "github_url": repo,
            "branch": branch,
            "debounce": deb
        }

        with state_lock:
            config_data["projects"].append(new_proj)
            config_data["active_project_id"] = new_id
            save_config(config_data)

        threading.Thread(target=ensure_git_setup, args=(new_proj,), daemon=True).start()
        log_event(f"➕ เพิ่มโปรเจกต์ใหม่: [{name}] และเปิดใช้งานทันที", "success")

        self.ent_name.delete(0, "end")
        self.ent_path.delete(0, "end")
        self.ent_repo.delete(0, "end")
        self.refresh_list()
        self.on_update_callback()


class HexSyncApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        ctk.set_appearance_mode("Dark")
        ctk.set_default_color_theme("blue")

        self.title("HexSyncTH Auto Sync Engine — Standalone Desktop")
        self.geometry("1100x740")
        self.minsize(920, 620)
        self.protocol("WM_DELETE_WINDOW", self.on_close)

        # Main Layout: 3 Rows (Header, Project & Metrics, Content)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        self.create_header()
        self.create_dashboard()
        self.create_main_content()

        # Init Git for active project in background
        init_proj = get_active_project()
        if init_proj:
            threading.Thread(target=ensure_git_setup, args=(init_proj,), daemon=True).start()

        # Start Background Watcher Thread
        self.watcher_thread = threading.Thread(target=background_watcher, daemon=True)
        self.watcher_thread.start()

        # UI Update Loop
        self.after(200, self.update_loop)

    def create_header(self):
        header = ctk.CTkFrame(self, fg_color="#11141c", corner_radius=0, height=64)
        header.grid(row=0, column=0, sticky="ew")
        header.grid_columnconfigure(1, weight=1)

        # Brand / Icon
        brand_frame = ctk.CTkFrame(header, fg_color="transparent")
        brand_frame.grid(row=0, column=0, padx=16, pady=12, sticky="w")

        ctk.CTkLabel(
            brand_frame,
            text="⚡ HEXSYNC·TH",
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"),
            text_color="#00d2ff"
        ).pack(side="left", padx=(0, 10))

        ctk.CTkLabel(
            brand_frame,
            text="MULTI-PROJECT GIT ENGINE // STANDALONE DESKTOP",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#8b949e"
        ).pack(side="left")

        # Top Right Status Pill
        self.status_pill = ctk.CTkLabel(
            header,
            text="● ARMED & WATCHING",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color="#2ea043",
            fg_color="#18271e",
            corner_radius=12,
            padx=14,
            pady=6
        )
        self.status_pill.grid(row=0, column=2, padx=16, pady=12, sticky="e")

    def create_dashboard(self):
        dash = ctk.CTkFrame(self, fg_color="#161a23", corner_radius=10)
        dash.grid(row=1, column=0, sticky="ew", padx=16, pady=(10, 6))
        dash.grid_columnconfigure(0, weight=1)

        # Row 0: 4 Metric Cards
        cards_row = ctk.CTkFrame(dash, fg_color="transparent")
        cards_row.grid(row=0, column=0, sticky="ew", padx=8, pady=(8, 4))
        cards_row.grid_columnconfigure((0, 1, 2, 3), weight=1)

        self.card_status = self.make_metric_card(cards_row, 0, "SYSTEM STATUS", "ARMED", "#00d2ff")
        self.card_syncs = self.make_metric_card(cards_row, 1, "TOTAL SYNCS", "0", "#2ea043")
        self.card_pending = self.make_metric_card(cards_row, 2, "PENDING CHANGES", "0 ไฟล์", "#e3b341")
        self.card_last = self.make_metric_card(cards_row, 3, "LAST SYNC", "--:--:--", "#a371f7")

        # Row 1: Project Selector Strip & Action Buttons
        strip = ctk.CTkFrame(dash, fg_color="#1c202c", corner_radius=8)
        strip.grid(row=1, column=0, sticky="ew", padx=8, pady=4)
        strip.grid_columnconfigure(1, weight=1)

        # Project Dropdown Selector
        ctk.CTkLabel(strip, text="📁 โปรเจกต์:", font=ctk.CTkFont(size=12, weight="bold")).grid(row=0, column=0, padx=(12, 6), pady=8)
        self.project_combo = ctk.CTkComboBox(
            strip, 
            values=self.get_project_titles(), 
            width=280, 
            command=self.on_project_selected
        )
        self.project_combo.grid(row=0, column=1, sticky="w", padx=0, pady=8)

        # Action Buttons
        btn_box = ctk.CTkFrame(strip, fg_color="transparent")
        btn_box.grid(row=0, column=2, padx=8, pady=8, sticky="e")

        self.btn_sync = ctk.CTkButton(
            btn_box,
            text="⚡ SYNC NOW",
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color="#238636",
            hover_color="#2ea043",
            width=115,
            command=self.trigger_manual_sync
        )
        self.btn_sync.pack(side="left", padx=4)

        self.btn_pause = ctk.CTkButton(
            btn_box,
            text="⏸ Pause",
            font=ctk.CTkFont(size=12),
            fg_color="#30363d",
            hover_color="#484f58",
            width=85,
            command=self.toggle_watching
        )
        self.btn_pause.pack(side="left", padx=4)

        ctk.CTkButton(
            btn_box,
            text="📂 Open Folder",
            font=ctk.CTkFont(size=12),
            fg_color="#21262d",
            hover_color="#30363d",
            width=100,
            command=self.open_current_folder
        ).pack(side="left", padx=4)

        ctk.CTkButton(
            btn_box,
            text="🌐 Open GitHub",
            font=ctk.CTkFont(size=12),
            fg_color="#21262d",
            hover_color="#30363d",
            width=105,
            command=self.open_current_repo
        ).pack(side="left", padx=4)

        ctk.CTkButton(
            btn_box,
            text="⚙️ Config",
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color="#1f6feb",
            hover_color="#388bfd",
            width=85,
            command=self.open_manage_dialog
        ).pack(side="left", padx=4)

        # Row 2: Sub-bar: Project Path & Debounce Countdown Bar
        meta_strip = ctk.CTkFrame(dash, fg_color="#141720", corner_radius=6)
        meta_strip.grid(row=2, column=0, sticky="ew", padx=8, pady=(4, 8))
        meta_strip.grid_columnconfigure(1, weight=1)

        self.lbl_path_info = ctk.CTkLabel(
            meta_strip,
            text="PATH: C:\\project  |  REMOTE: https://github.com/daimond33140/project_jr.git [main]",
            font=ctk.CTkFont(family="Consolas", size=11),
            text_color="#8b949e"
        )
        self.lbl_path_info.grid(row=0, column=0, padx=12, pady=6, sticky="w")

        # Countdown Progress Bar
        self.progress_bar = ctk.CTkProgressBar(meta_strip, height=8, corner_radius=4, progress_color="#00d2ff")
        self.progress_bar.grid(row=0, column=1, padx=(10, 12), pady=6, sticky="ew")
        self.progress_bar.set(0.0)

        self.set_current_combo_value()

    def make_metric_card(self, parent, col, title, initial_val, color):
        card = ctk.CTkFrame(parent, fg_color="#1d222e", corner_radius=8)
        card.grid(row=0, column=col, padx=4, pady=8, sticky="ew")

        ctk.CTkLabel(
            card,
            text=title,
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color="#8b949e"
        ).pack(anchor="w", padx=12, pady=(8, 0))

        val_label = ctk.CTkLabel(
            card,
            text=initial_val,
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"),
            text_color=color
        )
        val_label.pack(anchor="w", padx=12, pady=(2, 8))
        return val_label

    def create_main_content(self):
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.grid(row=2, column=0, sticky="nsew", padx=16, pady=(6, 12))
        content.grid_columnconfigure(0, weight=1)
        content.grid_rowconfigure(0, weight=1)

        # Tabview for Logs & Modified Files
        self.tabview = ctk.CTkTabview(content, fg_color="#161a23")
        self.tabview.grid(row=0, column=0, sticky="nsew")

        tab_logs = self.tabview.add("📋 Live Git Console (เรียลไทม์)")
        tab_files = self.tabview.add("📁 ไฟล์ที่มีการเปลี่ยนแปลง (Modified Files)")

        # --- Tab 1: Logs ---
        tab_logs.grid_columnconfigure(0, weight=1)
        tab_logs.grid_rowconfigure(0, weight=1)

        self.log_text = ctk.CTkTextbox(
            tab_logs,
            font=ctk.CTkFont(family="Consolas", size=12),
            fg_color="#0d1117",
            text_color="#c9d1d9",
            wrap="word",
            corner_radius=6
        )
        self.log_text.grid(row=0, column=0, sticky="nsew", padx=4, pady=4)

        # Text Tags
        self.log_text.tag_config("time", foreground="#6e7681")
        self.log_text.tag_config("info", foreground="#58a6ff")
        self.log_text.tag_config("success", foreground="#3fb950")
        self.log_text.tag_config("warn", foreground="#d29922")
        self.log_text.tag_config("error", foreground="#f85149")

        # Log toolbar
        log_bar = ctk.CTkFrame(tab_logs, fg_color="transparent")
        log_bar.grid(row=1, column=0, sticky="ew", padx=4, pady=(4, 0))

        self.lbl_status_msg = ctk.CTkLabel(
            log_bar,
            text="พร้อมทำงาน",
            font=ctk.CTkFont(size=11),
            text_color="#8b949e"
        )
        self.lbl_status_msg.pack(side="left")

        ctk.CTkButton(
            log_bar,
            text="ล้างข้อความ (Clear)",
            width=100,
            height=24,
            fg_color="#21262d",
            hover_color="#30363d",
            font=ctk.CTkFont(size=11),
            command=self.clear_logs
        ).pack(side="right")

        # --- Tab 2: Modified Files ---
        tab_files.grid_columnconfigure(0, weight=1)
        tab_files.grid_rowconfigure(0, weight=1)

        self.files_scroll = ctk.CTkScrollableFrame(tab_files, fg_color="#0d1117")
        self.files_scroll.grid(row=0, column=0, sticky="nsew", padx=4, pady=4)
        self.lbl_no_files = ctk.CTkLabel(
            self.files_scroll, 
            text="ไม่มีไฟล์ที่มีการแก้ไขในขณะนี้ (All changes synced to GitHub)", 
            font=ctk.CTkFont(size=12),
            text_color="#8b949e"
        )
        self.lbl_no_files.pack(pady=20)

    # --- UI Helpers & Event Handlers ---
    def get_project_titles(self):
        with state_lock:
            return [p.get("name", "Unnamed") for p in config_data.get("projects", [])]

    def set_current_combo_value(self):
        proj = get_active_project()
        if proj:
            self.project_combo.set(proj.get("name", ""))
            clean_repo = proj.get("github_url", "").replace(".git", "").split("github.com/")[-1] or "-"
            self.lbl_path_info.configure(
                text=f"📂 {proj.get('path')}   |   🔗 origin/{proj.get('branch', 'main')} -> {clean_repo}"
            )

    def on_project_selected(self, choice):
        with state_lock:
            for p in config_data.get("projects", []):
                if p.get("name") == choice:
                    config_data["active_project_id"] = p["id"]
                    save_config(config_data)
                    break
        proj = get_active_project()
        if proj:
            threading.Thread(target=ensure_git_setup, args=(proj,), daemon=True).start()
            log_event(f"🔄 สลับโปรเจกต์ไปที่: [{proj['name']}]", "info")
        self.set_current_combo_value()

    def trigger_manual_sync(self):
        with state_lock:
            if app_state["is_syncing"]:
                return
        threading.Thread(target=execute_sync, daemon=True).start()

    def toggle_watching(self):
        with state_lock:
            app_state["is_watching"] = not app_state["is_watching"]
            watching = app_state["is_watching"]

        if watching:
            self.btn_pause.configure(text="⏸ Pause", fg_color="#30363d")
            self.status_pill.configure(
                text="● ARMED & WATCHING",
                text_color="#2ea043",
                fg_color="#18271e"
            )
            log_event("▶️ เริ่มต้นการเฝ้าติดตามไฟล์ (Watcher Resumed)", "info")
        else:
            self.btn_pause.configure(text="▶ Resume", fg_color="#1f6feb")
            self.status_pill.configure(
                text="⏸ PAUSED",
                text_color="#d29922",
                fg_color="#2c2214"
            )
            log_event("⏸ หยุดการเฝ้าติดตามชั่วคราว (Watcher Paused)", "warn")

    def open_current_folder(self):
        proj = get_active_project()
        if proj and os.path.exists(proj["path"]):
            os.startfile(proj["path"])
        else:
            messagebox.showwarning("ไม่พบโฟลเดอร์", "โฟลเดอร์โปรเจกต์นี้ไม่มีอยู่จริงในเครื่อง")

    def open_current_repo(self):
        proj = get_active_project()
        if proj and proj.get("github_url"):
            url = proj["github_url"]
            if url.endswith(".git"):
                url = url[:-4]
            webbrowser.open(url)

    def open_manage_dialog(self):
        ManageProjectsDialog(self, on_update_callback=self.on_projects_updated)

    def on_projects_updated(self):
        self.project_combo.configure(values=self.get_project_titles())
        self.set_current_combo_value()

    def clear_logs(self):
        self.log_text.delete("1.0", "end")

    def update_loop(self):
        # 1. Process Logs Queue
        while not log_queue.empty():
            item = log_queue.get_nowait()
            t = item["time"]
            m = item["message"]
            lvl = item["level"]

            self.log_text.insert("end", f"[{t}] ", "time")
            self.log_text.insert("end", f"{m}\n", lvl)
            self.log_text.see("end")

        # 2. Update Metrics & Status
        with state_lock:
            watching = app_state["is_watching"]
            syncing = app_state["is_syncing"]
            total_syncs = app_state["total_syncs"]
            pending_count = app_state["pending_count"]
            pending_files = list(app_state["pending_files"])
            last_sync = app_state["last_sync"]
            deb_percent = app_state["debounce_percent"]
            status_msg = app_state["status_message"]

        self.card_syncs.configure(text=str(total_syncs))
        self.card_pending.configure(text=f"{pending_count} ไฟล์")
        self.card_last.configure(text=last_sync)
        self.lbl_status_msg.configure(text=status_msg)
        self.progress_bar.set(deb_percent)

        if syncing:
            self.card_status.configure(text="SYNCING...", text_color="#00d2ff")
            self.btn_sync.configure(state="disabled", text="⏳ Syncing...")
        elif not watching:
            self.card_status.configure(text="PAUSED", text_color="#d29922")
            self.btn_sync.configure(state="normal", text="⚡ SYNC NOW")
        else:
            self.card_status.configure(text="ARMED", text_color="#2ea043")
            self.btn_sync.configure(state="normal", text="⚡ SYNC NOW")

        # 3. Update Modified Files tab
        current_file_widgets = getattr(self, "_rendered_files_count", -1)
        if current_file_widgets != pending_count:
            for w in self.files_scroll.winfo_children():
                w.destroy()
            if not pending_files:
                ctk.CTkLabel(
                    self.files_scroll,
                    text="ไม่มีไฟล์ที่มีการแก้ไขในขณะนี้ (All changes synced to GitHub)",
                    font=ctk.CTkFont(size=12),
                    text_color="#8b949e"
                ).pack(pady=20)
            else:
                for f in pending_files:
                    f_row = ctk.CTkFrame(self.files_scroll, fg_color="#161b22", corner_radius=4)
                    f_row.pack(fill="x", pady=2, padx=4)
                    ctk.CTkLabel(
                        f_row,
                        text=f,
                        font=ctk.CTkFont(family="Consolas", size=12),
                        text_color="#58a6ff"
                    ).pack(anchor="w", padx=8, pady=4)
            self._rendered_files_count = pending_count

        self.after(300, self.update_loop)

    def on_close(self):
        stop_event.set()
        self.destroy()
        sys.exit(0)

if __name__ == "__main__":
    app = HexSyncApp()
    app.mainloop()
