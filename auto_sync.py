import os
import sys
import time
import subprocess
from datetime import datetime

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

WATCH_EXTS = {'.html', '.js', '.css', '.json', '.md'}
IGNORE_DIRS = {'.git', '.github', 'scratch', 'node_modules'}
DEBOUNCE_SECONDS = 3

print("=" * 60)
print("[HexSyncTH] Git Auto Sync & Push Watcher Running...")
print("[HexSyncTH] Monitoring changes in project files...")
print("=" * 60)

def get_files():
    files = {}
    for root, dirs, filenames in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext in WATCH_EXTS:
                path = os.path.join(root, f)
                try:
                    files[path] = os.path.getmtime(path)
                except OSError:
                    pass
    return files

last_mtimes = get_files()

while True:
    try:
        time.sleep(1)
        current_mtimes = get_files()
        changed = []
        for path, mtime in current_mtimes.items():
            if path not in last_mtimes or mtime > last_mtimes[path]:
                changed.append(path)

        if changed:
            print(f"\n[Change Detected] {len(changed)} file(s) modified: {', '.join(changed[:3])}")
            print(f"Waiting {DEBOUNCE_SECONDS}s for edits to settle...")
            time.sleep(DEBOUNCE_SECONDS)

            # Update cache
            last_mtimes = get_files()

            # Check git status
            status = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True).stdout.strip()
            if not status:
                print("No git changes to commit.")
                continue

            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] Adding files to Git...")
            subprocess.run(['git', 'add', 'index.html', 'app.js', 'style.css', 'data.js', 'vercel.json', 'README.md'])
            
            commit_msg = f"Auto update: {timestamp}"
            commit_res = subprocess.run(['git', 'commit', '-m', commit_msg], capture_output=True, text=True)
            print(commit_res.stdout.strip())

            print(f"[{timestamp}] Pushing to GitHub (origin/main)...")
            push_res = subprocess.run(['git', 'push', 'origin', 'main'], capture_output=True, text=True)
            print(push_res.stdout.strip())
            if push_res.stderr.strip():
                print(push_res.stderr.strip())
            print(f"[SUCCESS] Synced and pushed to GitHub successfully at {timestamp}!\n")

    except KeyboardInterrupt:
        print("\nAuto sync stopped.")
        break
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(2)
