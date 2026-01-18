import React from 'react'

const Partner = ({ name, link, img}: { name: string, link: string, img:string }) => {
  return (
    <a href={link} target='_blank' className='group text-sm lg:text-base bg-[#f2f2f2] hover:bg-gray-200 ease-in-out duration-300 flex justify-center gap-2 items-center px-4 rounded-full py-2 font-semibold'>
      <img className='opacity-90 w-6 lg:w-8 group-hover:opacity-100' src={img} alt={img} />
      {name}
    </a>
  )
}

const BottomSide = () => {
  return (

    <div className='paddingX flex-1 py-4 flex flex-col gap-4 md:gap-0 md:flex-row justify-between md:items-center'>
      <div className='hidden md:block text-secondary font-semibold'><h2>Our crypto <br /> Investment partners</h2></div>
      <div className='block md:hidden text-secondary font-semibold'><h2>Our crypto Investment partners</h2></div>
      <div className='flex gap-4 md:gap-2 flex-wrap'>
        <Partner img='shibaLogo.png' link='https://shibaswap.com' name='SHIBASWAP' />
        <Partner img='meat.png' link='#' name='BONE' />
      </div>

      {/*       <div className='py-8 md:py-16 paddingX flex flex-col gap-8 xl:gap-4 md:flex-row justify-between'>
        <div className='md:w-2/5 lg:w-1/2 xl:w-1/3 flex flex-col gap-2'>
          <div className='border-b-2 border-b-gray-200'>
            <div className='flex pb-4'>
              <div className='xl:w-1/2 bg-orange-200 rounded-3xl'></div>
              <img src="./test.webp" alt="" className='w-[300px] xl:w-1/2 object-cover rounded-3xl' />
            </div>
          </div>
          <div>
            <p className='text-sm font-medium'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime, iure odio? br Tempora aspernatur harum pariatur. Iusto vel quis earum repellat! </p>
          </div>
        </div>
        <div className='flex flex-col md:w-2/5 gap-8'>
          <p className='text-xl lg:text-2xl xl:text-3xl'>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Minus necessitatibus ipsum blanditiis velit distinctio doloremque, voluptate maiores tempore. Iusto, aspernatur.
          </p>
          <div className='flex text-sm gap-2'>
            <a href='#' className='bg-doggo-500 text-center font-medium text-white py-2 px-4 rounded-full w-[120px]'>
              Buy
            </a>
            <a href='#' className='bg-white border border-gray-300 text-center font-medium text-black py-2 px-4 rounded-full w-[120px]'>
              Read more
            </a>
          </div>
        </div>
      </div> */}
    </div>
  )
}

export default BottomSide