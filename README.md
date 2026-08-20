# Food Cost

แอปจัดการต้นทุนและวางแผนซื้อวัตถุดิบสำหรับร้านอาหาร delivery (LINE MAN)

**Stack:** Vite · Vue 3 · TypeScript · Tailwind CSS · Supabase · Vercel

## เริ่มต้นใช้งาน

1. สร้างโปรเจกต์ [Supabase](https://supabase.com) แล้วรัน SQL จาก `supabase/schema.sql` ใน SQL Editor
2. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่า:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

3. ติดตั้งและรัน:

```bash
npm install
npm run dev
```

4. สมัครสมาชิกในหน้า login (ผู้ใช้คนเดียว — ไม่มีระบบ role)

ใน Supabase Authentication แนะนำปิดหรือเปิด Confirm email ตามที่ต้องการ ถ้าเปิด confirm ต้องกดลิงก์ในอีเมลก่อนเข้าสู่ระบบ

## Deploy (Vercel)

เชื่อม Git repo กับ Vercel แล้วตั้ง Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`vercel.json` ตั้ง rewrite สำหรับ Vue Router แล้ว

## สคริปต์

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | รัน dev server |
| `npm run build` | build production |
| `npm run preview` | ดู production build |
| `npm test` | รัน unit tests (cost calculator) |
