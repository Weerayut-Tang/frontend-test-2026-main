import Header, { HeaderAssignment } from '#/components/features/header'
import { Separator } from '#/components/ui/separator'
import YourCode from './your-codes'

const FeatureFlagAssignment = () => {
  return (
    <div className="bg-background text-foreground p-0 font-sans box-border">
      <Header
        title="Coding Challenge: The Feature Flag Editor"
        subTitle={
          <>
            สร้างระบบจัดการ Feature Flag แบบ Dynamic ที่มีประสิทธิภาพ
            สร้างฟิวด์ให้เหมือน{' '}
            <a
              href="https://gofeatureflag.org/editor"
              className="text-blue-500 underline ml-1"
              target="_blank text-sm"
            >
              GoFeatureFlag
            </a>{' '}
            มากที่สุด
          </>
        }
      />

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="space-y-5">
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
            <HeaderAssignment number={1} title="เป้าหมายของโจทย์" />
            <p className="mb-4">
              ให้สร้างหน้าเว็บไซต์สำหรับ "Editor" เพื่อกำหนดค่า{' '}
              <strong>Feature Flag</strong> ผู้ใช้ต้องสามารถเพิ่ม/ลดเงื่อนไขได้
              และเห็นผลลัพธ์ JSON ทันที
            </p>

            <h3 className="font-semibold mb-2">บังคับใช้เครื่องมือดังนี้:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>
                <strong>@tanstack/react-form:</strong> สำหรับจัดการ Form State
              </li>
              <li>
                <strong>Zod:</strong> สำหรับการทำ Schema Validation
              </li>
              <li>
                <strong>@monaco-editor/react:</strong> สำหรับจัดการ JSON Preview
              </li>
              <li>
                <strong>Tailwind CSS:</strong> สำหรับการทำ Styling
              </li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <HeaderAssignment number={2} title="ฟีเจอร์ที่ต้องมี" />
            <div className="space-y-4">
              <div className="border-l-4 border-red-500 pl-4">
                <p className="font-medium text-sm">Flag Metadata</p>
                <p className="text-sm text-muted-foreground italic">
                  ชื่อ Flag, คำอธิบาย, และสถานะ (Enabled/Disabled)
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-medium text-sm">Flag Variations</p>
                <p className="text-sm text-muted-foreground italic">
                  กำหนดได้ว่า Flag นี้จะคืนค่าเป็นอะไร (เช่น Variation A = true,
                  Variation B = false)
                </p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-medium text-sm">
                  Targeting Rules (Array Field)
                </p>
                <ul className="list-disc list-inside space-y-0 text-sm text-muted-foreground ml-2">
                  <li>Group เป็น Array และ Recursive</li>
                  <li>
                    Rule เป็น Array{' '}
                    <i>(ถ้าทำให้สามารถ Drag & Drop ได้ จะพิจารณาเป็นพิเศษ)</i>
                  </li>
                </ul>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="font-medium text-sm">Validation Logic</p>
                <p className="text-sm text-muted-foreground italic">
                  ต้องเช็ค Error ผ่าน Zod เช่น ชื่อ Flag ห้ามว่าง
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ฝั่งขวา: ตัวอย่างโครงสร้างข้อมูล (The Schema) */}
        <section className="space-y-5">
          <div className="bg-slate-950 rounded-xl border border-border overflow-hidden">
            <div className="bg-slate-900 px-4 py-2 border-b border-border flex justify-between items-center">
              <span className="text-xs font-mono text-slate-400">
                expected.json
              </span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed">
              <pre className="text-blue-300">
                {`{
  "flags": {
    "my-new-feature": {
      "variations": {
        "on": true,
        "off": false
      },
      "targeting": [
        {
          "query": "group == 'beta'",
          "percentage": 50,
          "variation": "on"
        }
      ],
      "defaultRule": {
        "variation": "off"
      }
    }
  }
}`}
              </pre>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 italic text-sm">
            <strong>Tip:</strong> อย่าลืมใช้ <code>form.Subscribe</code>{' '}
            ในการดึงค่าจาก TanStack Form ไปแสดงผลในหน้าต่าง Preview ด้านบนแบบ
            Real-time!
          </div>
        </section>
      </main>

      <Separator className="my-5 bg-slate-700" />

      <YourCode />
    </div>
  )
}

export default FeatureFlagAssignment
