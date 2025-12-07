import React, { useEffect, useRef, useState } from 'react'

const CategoryCard = ({ data, index = 0 }) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true)
        })
      },
      { threshold: 0.2 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 60}ms` }}
      className={`group w-[110px] h-[110px] md:w-[150px] md:h-[150px] rounded-2xl ring-1 ring-[#ff4d2d]/35 shrink-0 overflow-hidden bg-white shadow-lg hover:shadow-[0_22px_55px_rgba(255,77,45,0.28)] transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="relative w-full h-full">
        <img src={data?.image} alt={data?.category} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
        <div className="absolute inset-x-2 bottom-2 rounded-xl px-2 py-1 bg-rose-50/85 backdrop-blur-sm border border-[#ff4d2d]/20">
          <p className="text-[#7a2e1e] text-xs md:text-sm font-semibold truncate text-center">
            {data?.category}
          </p>
        </div>
      </div>
    </div>
  )
}

export default CategoryCard