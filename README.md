# พอร์ตนักลงทุนระดับโลก

เว็บ open source ติดตามพอร์ตของนักลงทุนระดับโลก จากแบบ 13F ที่ยื่นต่อ SEC สหรัฐฯ ข้อมูลทุกไตรมาสเก็บเป็นไฟล์ JSON ใน repo นี้ ทุกการเปลี่ยนแปลงพอร์ตจึงย้อนดูได้จาก git history

> **ไม่ใช่คำแนะนำการลงทุน** พอร์ตที่แสดงคือพอร์ต ณ วันสิ้นไตรมาส ซึ่งเปิดเผยช้าได้ถึง 45 วัน และมีเฉพาะหุ้นสหรัฐฯ ฝั่ง long

สถานะ: **เฟส 1 (กำลังพัฒนา)** นักลงทุน 100 คน มีหน้ารวม หน้านักลงทุน และหน้าหุ้นแล้ว ดูแผนทั้งหมดใน [plan.md](plan.md)

ไม่มีราคา live โดยตั้งใจ เพราะ API ราคาแบบฟรีไม่อนุญาตให้แสดงบนเว็บสาธารณะ เว็บจึงแสดงราคาสิ้นไตรมาสที่คำนวณจาก 13F และลิงก์ไปดูราคาปัจจุบันที่เว็บอื่น

## ทำงานอย่างไร

```
GitHub Actions (ทุก 1 ชั่วโมง)
  → npm run ingest: เช็ค EDGAR → ดาวน์โหลด 13F ใหม่ → map CUSIP → ticker → คำนวณ diff
  → commit /data เฉพาะเมื่อมีข้อมูลใหม่
  → Vercel build หน้าเว็บ static ใหม่
```

## ติดตามเอกสารใหม่

- หน้า `/filings` แสดงเอกสาร 13F ที่ยื่นล่าสุดของนักลงทุนทุกคน
- RSS ที่ `/feed.xml` (50 รายการล่าสุด) ใช้กับ RSS reader หรือต่อเข้า Discord / LINE ได้
- ลิงก์ใน RSS ใช้โดเมน production ของ Vercel ถ้าใช้โดเมนของตัวเองให้ตั้ง env `SITE_URL` บน Vercel

## ข้อมูลใน `/data`

| ไฟล์ | ที่มา | แก้ด้วยมือ |
|---|---|---|
| `investors.json` | รายชื่อนักลงทุนและ CIK | ✅ |
| `cusip-overrides.json` | ticker ที่ OpenFIGI หาไม่เจอหรือหาผิด (`{"CUSIP": "TICKER"}`) | ✅ |
| `filings/{cik}/{quarter}.json` | holdings ของแต่ละ CIK หลังรวมฉบับแก้ไข (13F-HR/A) แล้ว | ❌ |
| `cusip-map.json` | ผลจาก OpenFIGI (`null` = หาไม่เจอ) | ❌ |
| `portfolios/{investor}/{quarter}.json` | พอร์ตต่อคน รวมทุก CIK พร้อม ticker, สัดส่วน และการเปลี่ยนแปลงจากไตรมาสก่อน | ❌ |

ไฟล์ `portfolios/` สร้างจากไฟล์อื่นทั้งหมดด้วย `npm run derive` โดยไม่ต้องใช้เน็ต

**รายละเอียดที่ parser จัดการ**
- 13F-HR/A ประเภท `RESTATEMENT` แทนที่ฉบับเดิม ประเภท `NEW HOLDINGS` เพิ่มเข้าไป
- บาง filer ยังรายงานมูลค่าเป็นหลักพันดอลลาร์หลังปี 2023 จึงตรวจหน่วยจากราคาต่อหุ้นที่คำนวณได้
- สถานะ put/call แยกจากหุ้น และไม่นับรวมในมูลค่าพอร์ต (13F รายงานเป็นมูลค่าหุ้นอ้างอิง)
- ราคาสิ้นไตรมาสคือค่ามัธยฐานของมูลค่า ÷ จำนวนหุ้นจากทุกกองทุนที่ถือหุ้นตัวนั้น ช่วยลดความคลาดเคลื่อนจากกองทุนที่รายงานเป็นหลักพันดอลลาร์ (ไม่ปรับ split)
- บริษัทต่างชาติใช้รหัส CINS (ขึ้นต้นด้วยตัวอักษร) ซึ่งต้อง map กับ OpenFIGI แยกต่างหาก

## รันในเครื่อง

ต้องใช้ Node.js 22 ขึ้นไป

```bash
npm install
cp .env.example .env.local   # แล้วใส่ SEC_USER_AGENT
npm run ingest               # ดึงข้อมูล 8 ไตรมาสล่าสุดของทุกคน
npm run dev                  # http://localhost:3000
```

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run ingest -- --investor warren-buffett` | ดึงเฉพาะบางคน |
| `npm run ingest -- --quarters 4` | กำหนดจำนวนไตรมาสย้อนหลัง |
| `npm run ingest -- --force` | ดาวน์โหลดใหม่ทั้งหมด (หลังแก้ parser) |
| `npm run ingest -- --retry-missing-tickers` | ลอง map CUSIP ที่เคยหาไม่เจออีกครั้ง |
| `npm run derive` | สร้าง `data/portfolios` ใหม่จากไฟล์ในเครื่อง |
| `npm test` | unit tests |

## Deploy

1. Fork repo แล้ว import เข้า Vercel (ไม่ต้องตั้ง environment variable ฝั่ง Vercel)
2. ตั้ง GitHub secret `SEC_USER_AGENT` (และ `OPENFIGI_API_KEY` ถ้ามี) เพื่อให้ workflow `Ingest 13F filings` ทำงาน

## ร่วมพัฒนา

ดู [CONTRIBUTING.md](CONTRIBUTING.md)

## License

โค้ดใช้ [MIT](LICENSE) ส่วนข้อมูล 13F จาก SEC ใน `/data` เป็น public domain
