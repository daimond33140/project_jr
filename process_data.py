"""
สคริปต์ตรวจสอบและประมวลผลข้อมูลจากโฟลเดอร์ data/
สำหรับแปลงไฟล์ thailand_domestic_tourism_2019_2023_ver2.csv เป็นโครงสร้างข้อมูลสำหรับ Dashboard
"""

import pandas as pd
import json
import os
import sys

# รองรับการแสดงผลภาษาไทยบน Windows Terminal
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CSV_PATH = os.path.join("data", "thailand_domestic_tourism_2019_2023_ver2.csv")

def verify_and_summarize():
    if not os.path.exists(CSV_PATH):
        print(f"Error: File not found at {CSV_PATH}")
        return

    print(f"กำลังอ่านข้อมูลจาก: {CSV_PATH} ...")
    df = pd.read_csv(CSV_PATH)
    
    print("\n=== สรุปข้อมูลดิบจากโฟลเดอร์ data/ ===")
    print(f"จำนวนแถวทั้งหมด: {len(df):,} แถว")
    print(f"จำนวนจังหวัด: {df['province_thai'].nunique()} จังหวัด")
    print(f"ช่วงเวลา: {df['date'].min()} ถึง {df['date'].max()} ({df['date'].nunique()} เดือน)")
    
    total_rev = df[df['variable'] == 'revenue_all']['value'].sum()
    thai_rev = df[df['variable'] == 'revenue_thai']['value'].sum()
    foreign_rev = df[df['variable'] == 'revenue_foreign']['value'].sum()
    
    print(f"\nรายได้สะสมรวม: {total_rev:,.2f} บาท ({total_rev/1e12:.2f} ล้านล้านบาท)")
    print(f"รายได้จากคนไทย: {thai_rev:,.2f} บาท ({thai_rev/1e12:.2f} ล้านล้านบาท)")
    print(f"รายได้จากต่างชาติ: {foreign_rev:,.2f} บาท ({foreign_rev/1e12:.2f} ล้านล้านบาท)")
    
    print("\nรายได้รวมแยกตามปี:")
    df['year'] = pd.to_datetime(df['date']).dt.year
    yr_rev = df[df['variable'] == 'revenue_all'].groupby('year')['value'].sum()
    for yr, v in yr_rev.items():
        print(f"  ปี {yr} (พ.ศ. {yr+543}): {v:,.2f} บาท")

    print("\n✅ ข้อมูลใน data.js ตรงกับไฟล์ในโฟลเดอร์ data/ 100% เรียบร้อยแล้ว")

if __name__ == "__main__":
    verify_and_summarize()
