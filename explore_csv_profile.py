# -*- coding: utf-8 -*-
"""Full profiling of result.csv (349MB)"""
import pandas as pd
import numpy as np

PATH = r"C:\Users\CNYangMe8\Downloads\result.csv"

df = pd.read_csv(PATH, encoding="utf-8-sig", dtype=str, keep_default_na=True)
print("Rows:", len(df))
print("Columns:", len(df.columns))
print("=" * 70)

# ---- Column classification & null analysis ----
print("\n== NULL / DISTINCT / TYPE SUMMARY ==")
n = len(df)
for col in df.columns:
    nulls = df[col].isna().sum()
    n_empty = (df[col].astype(str).str.strip() == "").sum()
    non_null = df[col].notna().sum()
    distinct = df[col].nunique(dropna=True)
    print(f"{col:<20} null={nulls:>10} ({nulls/n:>6.1%})  empty_str={n_empty:>9}  distinct={distinct:>9}")

print("=" * 70)

# ---- Temporal columns ----
print("\n== BURYTIME RANGE ==")
bt = pd.to_datetime(df["Buytime"], errors="coerce")
print("min:", bt.min(), "| max:", bt.max(), "| coerce_null:", bt.isna().sum())
print("yearly distribution:")
print(bt.dt.year.value_counts().sort_index())

print("\n== EVENT_TIME ==")
if df["event_time"].notna().any():
    ev = pd.to_datetime(df["event_time"], errors="coerce")
    print("min:", ev.min(), "| max:", ev.max(), "| coerce_null:", ev.isna().sum())
else:
    print("ALL NULL")

print("\n== ICC_NHS_SKU_NAME ==")
sk = df["icc_nhs_sku_name"].dropna().astype(str)
if len(sk):
    print("non-null count:", len(sk), "| distinct:", sk.nunique())
    print(sk.value_counts().head(10))
else:
    print("ALL NULL")

print("\n== MD5_HASH ==")
mh = df["md5_hash"].dropna().astype(str)
if len(mh):
    print("non-null count:", len(mh), "| distinct:", mh.nunique())
    print(mh.value_counts().head(10))
else:
    print("ALL NULL")

print("=" * 70)

# ---- Categorical columns ----
print("\n== BRAND DISTRIBUTION ==")
print(df["Brand"].value_counts(dropna=False).head(20))

print("\n== STAGE DISTRIBUTION ==")
print(df["Stage"].value_counts(dropna=False).head(20))

# ---- Mobile identifier ----
print("\n== MOBILE ==")
mb = df["Mobile"].dropna().astype(str)
print("non-null:", len(mb), "| distinct:", mb.nunique(), "| dup rate: %.2f%%" % ((1 - mb.nunique()/len(mb))*100))
print("sample lengths:", mb.str.len().value_counts().head(10))
print("sample values:")
print(mb.head(8).tolist())

# ---- Duplicate row check ----
print("\n== FULL-ROW DUPLICATES ==")
dups = df.duplicated().sum()
print("exact duplicate rows:", dups, "(%.2f%%)" % (dups/len(df)*100))

# Multi-buy check per Mobile+Brand+Stage
key = df.groupby(["Mobile", "Brand", "Stage"]).size()
print("Mobile+Brand+Stage groups:", len(key), "| max buys per group:", key.max())
print("users (Mobile) with >1 distinct Brand+Stage:", (df.groupby("Mobile")[["Brand","Stage"]].nunique().sum(axis=1) > 1).sum())
