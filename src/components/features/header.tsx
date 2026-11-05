interface IHeader {
  title: string
  subTitle: React.ReactNode | string
}

function Header({ title, subTitle }: IHeader) {
  return (
    <header className="mb-5 border-b border-border pb-5">
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">{title}</h1>
      <p className="text-muted-foreground text-lg">{subTitle}</p>
    </header>
  )
}

interface IHeaderAssignment {
  number: number
  title: string
}
export function HeaderAssignment({ number, title }: IHeaderAssignment) {
  return (
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
      <span className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center text-3xl">
        {number}
      </span>
      {title}
    </h2>
  )
}

export default Header
