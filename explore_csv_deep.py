# -*- coding: utf-8 -*-
"""Deep pattern discovery on result.csv"""
import pandas as pd
import numpy as np

PATH = r"C:\Users\CNYangMe8\Downloads\result.csv"
df = pd.read_csv(PATH, encoding="utf-8-sig", dtype=str)
df["Buytime"] = pd.to_datetime(df["Buytime"])
df["month"] = df["Buytime"].dt.to_period("M")
n = len(df)

print("=" * 70)
print("== 1. MONTHLY PURCHASE TREND ==")
mt = df.groupby("month").size()
print(mt)

print("\n== 2. DAILY AVERAGE / PEAK ==")
d = df.groupby(df["Buytime"].dt.date).size()
print("days covered:", len(d), "| avg/day: %.0f" % d.mean(), "| max day:", d.max(), d.idxmax())

print("=" * 70)
print("== 3. USER PURCHASE FREQUENCY (rows per Mobile) ==")
uc = df["Mobile"].value_counts()
freq = uc.value_counts().sort_index()
print(freq.head(15))
print("users:", len(uc), "| repeat users (>=2):", (uc >= 2).sum(), "(%.1f%%)" % ((uc >= 2).sum() / len(uc) * 100))
print("avg purchases per user: %.2f" % uc.mean())

print("\n== 4. USERS BY STAGE COMBO ==")
stage_per_user = df.groupby("Mobile")["Stage"].agg(lambda s: "|".join(sorted(set(s))))
combo_counts = stage_per_user.value_counts()
print(combo_counts.head(12))

print("\n== 5. STAGE PAIRING (users who bought 一段 AND 三段) ==")
multi = stage_per_user[stage_per_user.str.contains("|", regex=False)]
print("users with >=2 stages:", len(multi), "(%.1f%% of users)" % (len(multi) / len(uc) * 100))

print("\n== 6. FIRST vs LAST STAGE (progression check) ==")
g = df.sort_values("Buytime").groupby("Mobile")["Stage"]
first = g.first()
last = g.last()
trans = pd.crosstab(first, last)
print(trans)

print("=" * 70)
print("== 7. SPECIAL SUBSET (rows with SKU data) ==")
sub = df[df["icc_nhs_sku_name"].notna()].copy()
print("rows:", len(sub), "| distinct users:", sub["Mobile"].nunique())
print("stage distribution:")
print(sub["Stage"].value_counts())
print("sku x stage:")
print(pd.crosstab(sub["icc_nhs_sku_name"], sub["Stage"]))
print("\nsku users buying 超启能恩 stages:")
print("skus by user count:") 
print(sub.groupby("Mobile")["icc_nhs_sku_name"].nunique().value_counts().head(5))
print("\ntime range of special subset:", sub["Buytime"].min(), "->", sub["Buytime"].max())

print("\n== 8. DO SPECIAL-SKU USERS ALSO BUY SUPER NUTRITION REGULARLY? ==")
sku_users = set(sub["Mobile"])
all_users = set(df["Mobile"])
print("special users also in main data: %d / %d" % (len(sku_users & all_users), len(sku_users)))

print("\n== 9. TIME GAP BETWEEN CONSECUTIVE PURCHASES (all users) ==")
s = df.sort_values(["Mobile", "Buytime"])
gaps = s.groupby("Mobile")["Buytime"].diff().dt.days.dropna()
gaps = gaps[gaps > 0]
print("gap days: mean=%.1f median=%.0f p25=%d p75=%d" % (gaps.mean(), gaps.median(), gaps.quantile(0.25), gaps.quantile(0.75)))
print("gaps 0-7d: %.1f%% | 8-30d: %.1f%% | 31-90d: %.1f%% | 91-180d: %.1f%% | >180d: %.1f%%" % (
    (gaps <= 7).mean() * 100, ((gaps > 7) & (gaps <= 30)).mean() * 100,
    ((gaps > 30) & (gaps <= 90)).mean() * 100, ((gaps > 90) & (gaps <= 180)).mean() * 100,
    (gaps > 180).mean() * 100))

print("\n== 10. HOUR-OF-DAY DISTRIBUTION ==")
print(df["Buytime"].dt.hour.value_counts().sort_index().head(8).to_dict())
print("...", df["Buytime"].dt.hour.value_counts().sort_index().tail(8).to_dict())

print("\n== 11. SAMPLE OF SPECIAL SUBSET ROWS ==")
print(sub[["Mobile", "Stage", "Buytime", "icc_nhs_sku_name", "event_time", "md5_hash"]].head(10).to_string())
