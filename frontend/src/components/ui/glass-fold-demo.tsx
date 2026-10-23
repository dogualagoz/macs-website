import { GlassFold, GlassFoldProps } from "./glass-fold"

export default function GlassFoldDemo(props: GlassFoldProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#06081e]">
      <GlassFold {...props} />
    </div>
  )
}
