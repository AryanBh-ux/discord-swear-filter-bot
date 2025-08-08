import { ReactNode } from 'react'

export default function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-800/50 backdrop-blur-md p-6 border border-gray-700">
      {children}
    </div>
  )
}
