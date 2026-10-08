# ร่วมพัฒนา

## เพิ่มหรือแก้ไขนักลงทุน

แก้ `data/investors.json` แล้วส่ง PR

```json
{
  "id": "seth-klarman",
  "name": "Seth Klarman",
  "fund": "Baupost Group",
  "ciks": ["1061768"],
  "styles": ["value"],
  "notes": "ไม่บังคับ"
}
```

- `id`: ตัวพิมพ์เล็กคั่นด้วย `-` ใช้เป็น URL
- `ciks`: CIK จาก [EDGAR company search](https://www.sec.gov/edgar/searchedgar/companysearch) ไม่ต้องมีเลข 0 นำหน้า ถ้านักลงทุนยื่นผ่านหลายนิติบุคคล ให้ใส่ทุก CIK ระบบจะรวม holdings ในไตรมาสเดียวกันให้
- `styles`: `value`, `growth`, `activist`, `macro`, `quant`, `distressed`
- CIK เดียวกันใช้ได้กับนักลงทุนคนเดียว

ก่อนส่ง PR ให้รัน:

```bash
npm run ingest -- --investor <id>
npm test
```

แล้ว commit ไฟล์ใน `data/` ที่เปลี่ยนไปด้วย CI จะเช็คว่า `data/portfolios` ตรงกับไฟล์ต้นทาง

## แก้ ticker ที่ผิดหรือหาไม่เจอ

ใส่ใน `data/cusip-overrides.json` แล้วรัน `npm run derive`

```json
{ "512807108": "LRCX" }
```

ใส่ `null` เพื่อบังคับว่าไม่มี ticker ห้ามแก้ `cusip-map.json` ด้วยมือ เพราะเป็นไฟล์ที่สคริปต์สร้าง

## โค้ด

- `lib/` โค้ดที่ไม่มี I/O ใช้ร่วมกันระหว่างสคริปต์กับหน้าเว็บ (มี unit test)
- `scripts/ingest/` ดึงข้อมูลจาก EDGAR และ OpenFIGI
- `app/` หน้าเว็บ Next.js ซึ่ง build เป็น static ทั้งหมด

ห้าม commit API key และห้ามเก็บข้อมูลราคาหุ้นใน repo
