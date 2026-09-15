# -*- coding: utf-8 -*-
"""Final verification & relationship checks on result.csv"""
import pandas as pd

PATH = r"C:\Users\CNYangMe8\Downloads\result.csv"
df = pd.read_csv(PATH, encoding="utf-8-sig", dtype=str)
df["Buytime"] = pd.to_datetime(df["Buytime"])

print("== 1. md5_hash == Mobile ? (special subset only) ==")
sub = df[df["md5_hash"].notna()].copy()
match = (sub["md5_hash"] == sub["Mobile"]).mean()
print("rows where md5_hash == Mobile: %.2f%%" % (match * 100))

print("\n== 2. ALLERGY-EVENT GRANULARITY ==")
# Unique allergy purchase events (per user + sku + event_time)
ev = sub.groupby(["Mobile", "icc_nhs_sku_name", "event_time"]).size()
print("unique allergy events:", len(ev))
print("allergy rows: %d -> each event maps to avg %.2f 超启能恩 Buytime rows" % (len(sub), len(sub) / len(ev)))

print("\n== 3. EVENT_TIME MONTHLY DISTRIBUTION ==")
evt = pd.to_datetime(sub["event_time"])
print(evt.dt.to_period("M").value_counts().sort_index())

print("\n== 4. SAME USER, DIFFERENT SKU? ==")
us = sub.groupby("Mobile")["icc_nhs_sku_name"].nunique()
print("users with >1 sku type:", (us > 1).sum(), "/", len(us))

print("\n== 5. STAGE vs SPECIAL-SUBSET PRESENCE ==")
sub_stages = set(sub["Stage"])
print("stages present in special subset:", sorted(sub_stages))
print("any 四段 special rows:", (sub["Stage"] == "四段").sum())

print("\n== 6. QUALITY CHECKS ==")
print("exact dup rows:", df.duplicated().sum())
print("Stage invalid values:", [v for v in df['Stage'].unique() if v not in ('一段','二段','三段','四段')] or "none")
print("Buytime out of range (pre-2025):", (df['Buytime'] < '2025-01-01').sum())
print("Buytime future (after 2026-08-19):", (df['Buytime'] > '2026-08-19').sum())

print("\n== 7. SPECIAL SUBSET: DOES ONE USER HAVE MULTIPLE ALLERGY EVENTS? ==")
ev_per_user = sub.groupby("Mobile")["event_time"].nunique()
print("events per user: mean=%.2f max=%d" % (ev_per_user.mean(), ev_per_user.max()))
print(ev_per_user.value_counts().sort_index().head(8))

print("\n== 8. WEEKDAY DISTRIBUTION ==")
wd = df["Buytime"].dt.dayofweek.value_counts().sort_index()
print({k: int(v) for k, v in wd.items()})
print("weekday ratio: %.2f%%" % (wd[[0,1,2,3,4]].sum() / wd.sum() * 100))
