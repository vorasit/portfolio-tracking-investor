# แผนโปรเจกต์: เว็บติดตามพอร์ตนักลงทุนระดับโลก 100 คน

> Open source · Deploy บน Vercel · ค่าใช้จ่ายเริ่มต้นเกือบเป็นศูนย์

---

## 1. เป้าหมายและนิยามสินค้า

เว็บแสดงพอร์ตการลงทุนของนักลงทุนที่ประสบความสำเร็จ 100 คน โดยใช้ข้อมูลที่เปิดเผยตามกฎหมาย (SEC สหรัฐฯ) พร้อมมูลค่าพอร์ตที่อัปเดตตามราคาตลาด

**คำนิยาม "real time" ของโปรเจกต์นี้**

พอร์ตของนักลงทุนไม่มีการเปิดเผยแบบ real time สิ่งที่เว็บทำได้คือ:

- **พอร์ตล่าสุดที่เปิดเผย** (ระบุวันที่ของข้อมูลชัดเจนทุกจุด)
- **มูลค่าและกำไร/ขาดทุนแบบ live** คำนวณจากสัดส่วนหุ้นล่าสุด × ราคาตลาดปัจจุบัน
- **อัปเดตเร็วที่สุด** เมื่อมีการยื่นเอกสารใหม่ (เช็คทุก ~30 นาที)

---

## 2. แหล่งข้อมูล

### ข้อมูลพอร์ต (SEC EDGAR — ฟรี, public domain)

| เอกสาร | เปิดเผยอะไร | ความล่าช้า |
|---|---|---|
| **13F-HR** | หุ้นสหรัฐฯ ทั้งพอร์ตของผู้จัดการกองทุน > $100M | รายไตรมาส ยื่นช้าสุด 45 วันหลังจบไตรมาส |
| **13F-HR/A** | ฉบับแก้ไขของ 13F | ไม่แน่นอน |
| **13D / 13G** | ถือหุ้นเกิน 5% ในบริษัทใดบริษัทหนึ่ง | ไม่กี่วันทำการ |
| **Form 4** | ซื้อขายของผู้บริหาร / ผู้ถือหุ้นใหญ่ >10% | ภายใน 2 วันทำการ |

**ข้อจำกัดของ 13F:** มีเฉพาะหุ้นสหรัฐฯ ฝั่ง long ไม่มี short, เงินสด, ตราสารหนี้ส่วนใหญ่ และหุ้นนอกสหรัฐฯ

### ข้อมูลประกอบ

| ข้อมูล | แหล่ง | หมายเหตุ |
|---|---|---|
| CUSIP → ticker | OpenFIGI API (ฟรี) | 13F ระบุหุ้นด้วย CUSIP ต้อง map เอง แล้ว cache เป็นไฟล์ |
| ราคาหุ้น | Finnhub / Twelve Data (free tier) | ห้ามเก็บราคาลง repo ดึงสดผ่าน API route เท่านั้น |

---

## 3. การคัดเลือก 100 คน

**เกณฑ์**
- ยื่น 13F อยู่และมี CIK ใน EDGAR
- AUM ขั้นต่ำตามที่กำหนด
- มีผลงานย้อนหลังยาว
- กระจายสไตล์: VI, growth, activist, macro, quant

**ปัญหาที่ต้องจัดการ**
- บางคนเกษียณหรือคืนเงินลงทุนไปแล้ว
- บางคนยื่นผ่านหลายนิติบุคคล ต้องรวมหลาย CIK
- quant fund ถือหุ้นนับพันตัว อาจไม่เหมาะกับผู้ใช้

**ผลลัพธ์:** `data/investors.json` (ชื่อ, กองทุน, CIK[], สไตล์, หมายเหตุ) ตรวจด้วยมือหนึ่งรอบ ทบทวนทุกปี และเปิดให้ชุมชนส่ง PR

**เว็บคู่แข่งที่ควรศึกษา:** Dataroma, WhaleWisdom, HedgeFollow
**จุดต่างที่เป็นไปได้:** ภาษาไทย, open source ตรวจสอบได้, ประวัติการเปลี่ยนแปลงเป็น git history, แจ้งเตือนที่ดีกว่า

---

## 4. ฟีเจอร์

### MVP
- หน้ารวม 100 คน: มูลค่าพอร์ต, ผลตอบแทนตั้งแต่ไตรมาสก่อน, วันที่ยื่นล่าสุด
- หน้านักลงทุน: holdings, สัดส่วน %, การเปลี่ยนแปลง (ซื้อใหม่ / เพิ่ม / ลด / ขายหมด)
- มูลค่าพอร์ตแบบ live
- หน้าหุ้น: มี superinvestor กี่คนถือหุ้นตัวนี้

### เฟสถัดไป
- ฟีดเอกสารใหม่ (13F, 13D, Form 4) + แจ้งเตือน
- Consensus picks: หุ้นที่ถูกซื้อพร้อมกันมากที่สุดในไตรมาส
- Backtest: "ถ้าลอกพอร์ตตั้งแต่วันที่ยื่น จะได้ผลตอบแทนเท่าไร"
- Watchlist ส่วนตัว, เปรียบเทียบหลายพอร์ต
- สรุปการเปลี่ยนแปลงพอร์ตด้วย AI เป็นภาษาไทย

---

## 5. สถาปัตยกรรม (Data-as-code)

Vercel เป็น serverless จึงไม่มี worker หรือ WebSocket ค้างไว้ตลอด งาน ingestion ย้ายไป GitHub Actions และเก็บข้อมูลเป็นไฟล์ JSON ใน repo

```
GitHub Actions (ทุก ~30 นาที)
  → เช็ค EDGAR ว่ามีเอกสารใหม่
  → parse + map CUSIP→ticker + คำนวณ diff
  → commit JSON ลง /data
  → Vercel build ใหม่อัตโนมัติ (หน้าเว็บ static)

Browser → /api/prices (Vercel Function, cache 60 วิ) → Price API
        → คำนวณมูลค่าพอร์ต live ฝั่ง client (poll ทุก 15–60 วิ)
```

**ข้อดี**
- ฟรี: Vercel Hobby + GitHub Actions (repo สาธารณะ) + price API free tier
- ทุกการเปลี่ยนแปลงพอร์ตเป็น git commit ย้อนดูและตรวจสอบได้
- คนอื่น fork ไป deploy เองได้ง่าย

**เพิ่มฐานข้อมูลเมื่อไร:** เมื่อทำระบบสมาชิก / watchlist / แจ้งเตือนรายคน → Postgres (Neon หรือ Supabase ผ่าน Vercel Marketplace)

---

## 6. Tech stack

| ส่วน | เครื่องมือ |
|---|---|
| Frontend | Next.js (App Router), Tailwind CSS, shadcn/ui |
| กราฟ | Recharts หรือ Apache ECharts |
| Ingestion | Python หรือ TypeScript รันใน GitHub Actions |
| Hosting | Vercel |
| แจ้งเตือน (เฟส 2) | RSS, Discord webhook, LINE Messaging API |
| ฐานข้อมูล (เฟส 3) | Postgres (Neon / Supabase) |

---

## 7. โครงสร้าง repo

```
/app                              หน้าเว็บ Next.js
/app/api/prices                   proxy ราคาหุ้น + cache
/data/investors.json              master list 100 คน + CIK
/data/filings/{cik}/{quarter}.json            holdings ต่อ CIK (หลังรวม 13F-HR/A)
/data/portfolios/{investor}/{quarter}.json    พอร์ตต่อคน รวมหลาย CIK + ticker + changes
/data/cusip-map.json
/data/cusip-overrides.json
/lib                              data model, parser, diff (ใช้ร่วมกับหน้าเว็บ)
/scripts/ingest                   ดึงและ parse จาก EDGAR
/.github/workflows/ingest.yml
.env.example
README.md · LICENSE · CONTRIBUTING.md
```

### Data model (JSON)

- `investors`: id, ชื่อ, กองทุน, ciks[], สไตล์, หมายเหตุ
- `filings`: cik, form type, period, filed_at, accession no.
- `holdings`: cusip, ticker, ชื่อหุ้น, shares, value, % ของพอร์ต
- `changes`: cusip, action (new / add / reduce / exit), shares_delta

---

## 8. ข้อกำหนดเฉพาะ open source

- **ห้าม commit API key** ใช้ `.env.example` + GitHub / Vercel secrets
- **ห้ามเก็บข้อมูลราคาหุ้นใน repo** เพราะ license ผู้ให้บริการส่วนใหญ่ห้ามแจกจ่ายต่อ
- **ข้อมูล 13F จาก SEC** เก็บใน repo ได้
- **SEC กำหนด User-Agent** ที่มีชื่อและอีเมลติดต่อ และต้องเคารพ rate limit
- **License โค้ด:** MIT (ใช้ได้อิสระ) หรือ AGPL (บังคับแชร์โค้ดกลับถ้านำไปทำเว็บ) — ยังไม่ได้เลือก

---

## 9. แผนการทำงาน

| เฟส | งาน |
|---|---|
| **0 – ทดลอง** | สร้าง repo, ingest script สำหรับ 5 คน, CUSIP mapping, diff ระหว่างไตรมาส, deploy หน้าเปล่าขึ้น Vercel |
| **1 – MVP** | ครบ 100 คน, หน้ารวม / นักลงทุน / หุ้น, ราคา live ผ่าน `/api/prices` |
| **2 – ความเคลื่อนไหว** | Form 4 + 13D, หน้าฟีดล่าสุด, RSS + webhook แจ้งเตือน |
| **3 – ขยาย** | Postgres, ระบบสมาชิก, watchlist, backtest, สรุปด้วย AI |

---

## 10. ความเสี่ยง

| ความเสี่ยง | การรับมือ |
|---|---|
| ผู้ใช้เข้าใจผิดว่าเป็นพอร์ตปัจจุบัน | แสดงวันที่ของข้อมูลทุกหน้า |
| License ราคา real time สำหรับแสดงสาธารณะ | เริ่มด้วยราคา delayed ถ้า free tier ไม่อนุญาต |
| 13F ฉบับแก้ไข (13F-HR/A) | parser รองรับการแทนที่ข้อมูลเดิม |
| CUSIP map ไม่ครบ | cache + แก้ด้วยมือผ่านไฟล์ override |
| โควต้า Vercel Hobby และข้อห้ามใช้เชิงพาณิชย์ | หน้า static + cache; ขยับเป็น Pro ถ้าจะหารายได้ |
| ประเด็นกฎหมาย | ใส่ disclaimer ว่าไม่ใช่คำแนะนำการลงทุน |

---

## 11. สิ่งที่ยังต้องตัดสินใจ

- [ ] ชื่อ repo / ชื่อโปรเจกต์
- [ ] License: MIT หรือ AGPL
- [ ] ภาษาหน้าเว็บ: ไทย, อังกฤษ หรือทั้งคู่
- [ ] ราคา real time หรือ delayed 15 นาทีสำหรับเวอร์ชันแรก
- [ ] ใช้ส่วนตัว / สาธารณะฟรี / เก็บเงิน
- [x] ภาษาของ ingest script: TypeScript
