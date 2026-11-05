# Frontend Test 2026 🚀

> Frontend Developer Challenge

ยินดีต้อนรับสู่ **Frontend Test 2026**! โปรเจกต์นี้เป็นข้อสอบสำหรับการคัดเลือก Frontend Developer ซึ่งจะจำลองการพัฒนาแอปพลิเคชันจริงโดยเน้นเรื่อง Architecture, State Management, Validation และการทำ User Interface

> ในปัจจุบันโปรเจกต์จะประกอบไปด้วยการทดสอบหลัก ได้แก่ The Feature Flag Editor

## 🛠 Tech Stack

โปรเจกต์นี้ถูกเซ็ตอัปพื้นฐานด้วยเทคโนโลยีสมัยใหม่ เพื่อประสบการณ์การพัฒนาที่รวดเร็วและเป็นมาตรฐาน:

- **Framework:** React 19 + [@tanstack/react-start](https://tanstack.com/start/latest)
- **Routing:** [@tanstack/react-router](https://tanstack.com/router/latest)
- **Form Management:** [@tanstack/react-form](https://tanstack.com/form/latest)
- **Validation:** [Zod](https://zod.dev/)
- **Code Editor / JSON Preview:** [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
- **Styling:** Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Testing:** [Vitest](https://vitest.dev/)

## 🚀 Getting Started

กรุณาทำตามขั้นตอนด้านล่างเพื่อเริ่มการทดสอบ:

### 1. การติดตั้ง (Installation)

โปรเจกต์นี้ใช้ `pnpm` เป็น Package Manager (หากคุณยังไม่มีสามารถติดตั้งได้ด้วย `npm install -g pnpm`)

```bash
pnpm install
```

### 2. รันรันโปรเจกต์สำหรับการพัฒนา (Development)

```bash
pnpm dev
```

หลังจากรันคำสั่ง โปรเจกต์จะสามารถเข้าถึงได้ผ่าน `http://localhost:3000`

### 3. ส่วนของการทดสอบ (Challenge)

เมื่อเปิดโปรเจกต์ขึ้นมาบน Browser คุณจะพบกับหน้า **Assignment Dashboard**

- ให้กดเข้าไปที่ส่วนของโจทย์การทดสอบ **Feature Flag Editor**
- โค้ดสำหรับการทดสอบของคุณจะเริ่มต้นให้เขียนได้ที่ไฟล์ `/src/pages/code-challenge/feature-flag-form/your-codes/index.tsx`
- คุณสามารถดูรายละเอียดของโจทย์ได้ที่ไฟล์ `/src/pages/code-challenge/feature-flag-form/README.md`

## 📝 Scripts

คุณสามารถใช้คำสั่งพื้นฐานเหล่านี้ในระหว่างการพัฒนาได้:

- `pnpm dev`: เริ่มต้น Development Server ที่ Port 3000
- `pnpm build`: บิวด์โปรเจกต์สำหรับ Production
- `pnpm preview`: จำลอง Production environment หลังจาก Build
- `pnpm test`: รัน Unit Tests ด้วย Vitest
- `pnpm format`: จัด Format โค้ดของคุณด้วย Prettier
- `pnpm lint`: ตรวจสอบความถูกต้องของโค้ดด้วย ESLint
- `pnpm check`: จัด Format โค้ดและแก้ไข Lint รวดเดียว

## 🎯 กฎและกติกา (Rules & Guidelines)

1. **อ่านข้อกำหนดของแต่ละโจทย์ (Requirements) ให้ชัดเจน:** คุณสามารถดูเงื่อนไข และฟีเจอร์ที่ต้องมีได้ในหน้าโจทย์แต่ละข้อ
2. **ใช้ Tools ที่กำหนด:** กรุณาใช้เครื่องมือที่กำหนดใน Requirements เช่น `@tanstack/react-form` และ `zod`
3. **จัดระเบียบโค้ดให้สวยงามและอ่านง่าย:** คำนึงถึงการแบ่ง Components, Naming Conventions, และ Performance ตามมาตรฐานของ Senior Developer
4. **ความสมบูรณ์แบบของ UI/UX:** เนื่องจากโจทย์เป็นการจำลองระบบจริง ให้ทำ UI/UX ออกมาให้ดีและใช้ประโยชน์จาก Tailwind CSS ให้ได้มากที่สุด

ขอให้โชคดี! 🍀
