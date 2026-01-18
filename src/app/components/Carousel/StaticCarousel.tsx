'use client';
import { Carousel } from "react-responsive-carousel";
import { BsFillArrowRightCircleFill, BsFillArrowLeftCircleFill } from 'react-icons/bs'
import "react-responsive-carousel/lib/styles/carousel.min.css";
import CarouselItem from "./Item";
import { carouselImages } from "./images";
import { useState } from "react";

export default function StaticCarousel() {

  const [currentItem, setCurrentItem] = useState(1)

  return (
    <div className="relative w-[300px] md:w-[400px] flex flex-col gap-4 rounded-[40px] bg-white h-fit pt-6 py-4 px-6 md:px-8">
      <Carousel
        infiniteLoop={true}
        showThumbs={false}
        showIndicators={false}
        showStatus={false}
        renderArrowNext={(onClickHandle) => (
          <BsFillArrowRightCircleFill
            className='absolute -right-3 lg:-right-5 top-[50%] text-2xl lg:text-3xl text-secondary/60 hover:text-secondary ease-in-out duration-300 cursor-pointer'
            onClick={() => {
              onClickHandle()
              currentItem >= carouselImages.length ? setCurrentItem(1) : setCurrentItem(prev => prev + 1)
            }} />
        )}
        renderArrowPrev={(onClickHandle) => (
          <BsFillArrowLeftCircleFill
            className='absolute -left-3 lg:-left-5 top-[50%] z-20 text-2xl lg:text-3xl text-secondary/60 hover:text-secondary ease-in-out duration-300 cursor-pointer'
            onClick={() => {
              onClickHandle()
              currentItem <= 1 ? setCurrentItem(carouselImages.length) : setCurrentItem(prev => prev - 1)
            }} />
        )}
        className=""
      >
        {
          carouselImages.map((e, i) => (
            <CarouselItem key={i} title={e.title} description={e.description} src={e.src} />
          ))
        }
      </Carousel>
      <div className="flex gap-3 items-center justify-end">
        <div className="flex gap-1 items-center">
          {carouselImages.map((_, i) => (
            <div key={i} className={`${currentItem === i + 1 ? 'bg-doggo-500' : 'bg-doggo-500/50'} h-1 w-[35px] rounded-sm ease-in-out duration-300`}/>
          ))}
        </div>
        <p className="text-xs font-bold"> {`${currentItem} / ${carouselImages.length}`} </p>
      </div>
    </div>
  )
}


