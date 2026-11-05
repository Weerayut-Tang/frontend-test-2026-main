# 🚩 Feature Flag Editor Challenge

ยินดีต้อนรับสู่บททดสอบทักษะ Frontend Developer โจทย์ของคุณคือการสร้าง **Feature Flag Editor** ที่ทรงพลังและใช้งานง่าย โดยอ้างอิงมาตรฐานจาก [GoFeatureFlag](https://gofeatureflag.org/editor)

## 🎯 How we evaluate (เราตรวจงานคุณจากอะไร?)

เราไม่ได้ดูแค่ว่าโปรเจกต์ "รันได้" หรือไม่ แต่เราให้ความสำคัญกับ **คุณภาพของงานวิศวกรรม (Engineering Quality)** ในแง่มุมต่างๆ ดังนี้:

### 📊 ตารางการให้คะแนน (รวม 20 คะแนน)

| เกณฑ์การให้คะแนน (Criteria) | รายละเอียด (Details) | คะแนน (Points) |
| :--- | :--- | :---: |
| **1. Feature Flag Logic & Targeting** | รองรับการสร้าง Targeting rules ที่ซับซ้อน เช่น การสร้าง Group, กำหนด Role และเงื่อนไขแบบ Recursive/Nested | **7** |
| **2. State Management & Validation** | การจัดการ Nested Form ด้วย `@tanstack/react-form` อย่างมีประสิทธิภาพ และตรวจสอบข้อมูลด้วย `Zod` | **5** |
| **3. Project Structure** | การแยกส่วน UI และ Logic อย่างชัดเจน (Separation of Concerns) และโครงสร้างที่รองรับ Scalability | **4** |
| **4. UI/UX & Output Accuracy** | การแสดงผล JSON Preview แบบ Real-time, โครงสร้าง Output ถูกต้อง และแจ้งเตือน Error ชัดเจน | **4** |
| **รวม (Total)** | | **20** |

### 1. ตรรกะฟีเจอร์แฟล็กและการกำหนดเป้าหมาย (Feature Flag Logic & Targeting)

นี่คือหัวใจสำคัญของโปรเจกต์ เราต้องการดูว่าคุณจัดการกับความซับซ้อนของฟีเจอร์แฟล็กได้อย่างไร:

- **Complex Rule Builder:** ความสามารถในการสร้างเงื่อนไขแบบซ้อนทับ (Recursive/Nested) สำหรับ Targeting rules
- **Group & Role Management:** การจัดการสร้างกลุ่ม (Groups) และการกำหนดสิทธิ์ (Roles) ได้อย่างถูกต้องและยืดหยุ่น

### 2. การจัดการข้อมูลและสถานะ (State Management & Validation)

- **Efficient Nested Form:** การใช้ `@tanstack/react-form` สำหรับฟอร์มที่มีโครงสร้างลึก (Deeply nested) อย่างมีประสิทธิภาพ ไม่ทำให้เกิด Re-render ที่ไม่จำเป็น
- **Data Integrity:** การใช้ `Zod` เพื่อตรวจสอบความถูกต้องของข้อมูล (Validation) ในทุกระดับชั้นก่อนที่จะส่งเป็นผลลัพธ์

### 3. โครงสร้างโค้ดที่อ่านง่าย (Project Structure)

ถึงแม้เราจะไม่ได้บังคับใช้ Pattern ที่ซับซ้อน แต่เรามองหาการจัดวางไฟล์ที่เป็นระเบียบ:

- **Separation of Concerns:** แยกส่วนของ UI (Components) ออกจาก Logic (Form Logic/Validation) อย่างชัดเจน
- **Scalability:** โครงสร้างโค้ดที่เอื้อต่อการเพิ่มรูปแบบเงื่อนไข (Rules) หรือฟีเจอร์ใหม่ๆ ในอนาคต

### 4. ประสบการณ์ผู้ใช้งานและความถูกต้อง (UI/UX & Output Accuracy)

- **Real-time Feedback & Output:** ผู้ใช้ควรเห็น JSON Preview เปลี่ยนแปลงทันที และ Output JSON จะต้องมีโครงสร้างที่แม่นยำตรงตาม Requirements
- **Error Communication:** หากกรอกข้อมูลผิด ระบบต้องแจ้งเตือนให้ชัดเจนว่าผิดที่จุดไหนและต้องแก้ไขอย่างไร
- **Consistent Styling:** การเลือกใช้ Tailwind CSS ที่สะอาดตา และมีความสม่ำเสมอของ Spacing/Borders

## 🛠 Tech Stack Requirements

- **Framework:** React (Vite + TanStack Start)
- **Form:** `@tanstack/react-form`
- **Validation:** `Zod`
- **JSON Preview:** `@monaco-editor/react`
- **Styling:** Tailwind CSS

## 🚀 Getting Started

1. **Clone** repository นี้ลงในเครื่องของคุณ
2. สร้าง **Repository ใหม่** ของคุณเอง (Public หรือ Private ก็ได้)
3. ลงมือทำโจทย์ให้เต็มที่!
4. เมื่อเสร็จแล้ว ส่ง Link Repository ของคุณกลับมาทางอีเมล

> **Note:** หากคุณมีการตัดสินใจเชิงเทคนิค (Technical Decisions) ที่น่าสนใจ สามารถเขียนอธิบายเพิ่มเติมไว้ในไฟล์ `NOTES.md` ได้ เรายินดีที่จะอ่านวิธีคิดของคุณครับ

**Happy Coding!** ขอให้สนุกกับการแก้โจทย์ครับ ✌️
