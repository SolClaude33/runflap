import React, { ReactNode } from 'react'
interface CarouselItemProps {
  src: string
  title: string
  description: ReactNode
}
const CarouselItem: React.FC<CarouselItemProps> = ({src, title, description}) => {
  return (
    <div className="flex gap-4 md:gap-3">
      <div className="w-[60px] md:w-[80px] h-fit">
        <img src={src} alt={src} className="object-cover" />
      </div>
      <div className="text-start flex flex-col gap-1">
        <h2 className="font-semibold text-base xl:text-lg"> {title} </h2>
        <span className="font-medium text-xs xl:text-sm w-[200px]"> {description} </span>
      </div>
    </div>
  )
}

export default CarouselItem