"""
Auto-Sync script for Thailand Tourism Intelligence Dashboard
เฝ้าติดตามการเปลี่ยนแปลงไฟล์ในโปรเจกต์ และทำการ Git Commit + Push ขึ้น GitHub โดยอัตโนมัติ
เพื่อให้ Vercel อัปเดตหน้าเว็บจริงทันทีที่มีการบันทึก (Save) โค้ด
"""

import subprocess
import time
import datetime
import os
import sys

# บังคับ UTF-8 สำหรับ Windows Terminal
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

DEBOUNCE_SECONDS = 5  # หน่วงเวลารอให้เซฟไฟล์เสร็จครบก่อน push
CHECK_INTERVAL = 3    # เช็คความเปลี่ยนแปลงทุกๆ กี่วินาที

def run_git_command(args):
    try:
        res = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return -1, "", str(e)

def get_changed_files():
    code, out, _ = run_git_command(["status", "--porcelain"])
    if code != 0 or not out:
        return []
    
    files = []
    for line in out.splitlines():
        line = line.strip()
        if len(line) > 3:
            files.append(line[3:].strip())
    return files

def sync_now(files):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    files_summary = ", ".join(os.path.basename(f) for f in files[:4])
    if len(files) > 4:
        files_summary += f" and {len(files) - 4} more"
    
    commit_msg = f"Auto-update: {files_summary} ({timestamp})"
    
    print(f"\n[{timestamp}] 📝 ตรวจพบการเปลี่ยนแปลงใน: {files_summary}")
    print("⏳ กำลัง Commit และ Push ขึ้น GitHub...")
    
    # Git add
    code, _, err = run_git_command(["add", "-A"])
    if code != 0:
        print(f"❌ Error during git add: {err}")
        return False
        
    # Git commit
    code, out, err = run_git_command(["commit", "-m", commit_msg])
    if code != 0:
        if "nothing to commit" in out or "nothing to commit" in err:
            return True
        print(f"❌ Error during git commit: {err or out}")
        return False
        
    # Git push
    code, out, err = run_git_command(["push", "origin", "main"])
    if code == 0:
        print(f"🚀 Push ขึ้น GitHub สำเร็จ! Vercel กำลังอัปเดตหน้าเว็บจริง...")
        return True
    else:
        print(f"⚠️ Push ไม่สำเร็จ: {err or out}")
        return False

def main():
    print("=" * 60)
    print(" 🚀 Thailand Tourism Intelligence — Auto-Sync Watcher")
    print("=" * 60)
    print(" ระบบกำลังทำงานในพื้นหลัง...")
    print(f" • ตรวจสอบไฟล์ทุก {CHECK_INTERVAL} วินาที")
    print(f" • เมื่อเซฟไฟล์ จะหน่วงเวลา {DEBOUNCE_SECONDS} วินาที แล้ว Push ขึ้น GitHub อัตโนมัติ")
    print(" • กด Ctrl + C เพื่อหยุดการทำงาน\n")

    last_pending_change_time = None
    pending_files = []

    while True:
        try:
            changed = get_changed_files()
            
            if changed:
                if last_pending_change_time is None:
                    last_pending_change_time = time.time()
                    pending_files = changed
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 👀 ตรวจพบการแก้ไข รอให้เซฟเสร็จ ({DEBOUNCE_SECONDS} วิ)...")
                else:
                    pending_files = changed
                    
                # ถ้าพ้นช่วง Debounce แล้วให้ทำการ Sync
                if time.time() - last_pending_change_time >= DEBOUNCE_SECONDS:
                    sync_now(pending_files)
                    last_pending_change_time = None
                    pending_files = []
            else:
                last_pending_change_time = None
                pending_files = []

            time.sleep(CHECK_INTERVAL)
        except KeyboardInterrupt:
            print("\n🛑 หยุดการทำงานของ Auto-Sync เรียบร้อยแล้ว")
            break
        except Exception as e:
            print(f"Error in watcher: {e}")
            time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()
