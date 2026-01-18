"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AboutRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/')
  }, [router])
  
  return (
    <div className="min-h-screen bg-[#0d3320] flex items-center justify-center">
      <p className="text-white">Redirecting...</p>
    </div>
  )
}
