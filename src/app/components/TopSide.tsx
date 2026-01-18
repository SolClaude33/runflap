"use client"
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import Navbar from './Navbar'
import WhitepaperModal from './WhitepaperModal'
import { BsFillPlayFill } from 'react-icons/bs'
import StaticCarousel from './Carousel/StaticCarousel'
import { addWallet, getData } from '../firebase'
import Link from 'next/link'

const ButtonC = ({ title, link }: { title: string, link: string }) => (
  <Link href={link} type='button' className='w-fit font-bold text-sm sm:text-5xl text-center border-2 border-green-400 bg-green-500 hover:bg-green-600 ease-in-out duration-300 text-white py-2 px-4 rounded-full cursor-pointer'>
    {title}
  </Link>
)

const TopSide = () => {
  const [wallet, setWallet] = useState('')
  const [showWhitepaperModal, setShowWhitepaperModal] = useState(false)
  
  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newWalletValue = event.target.value;
    setWallet(newWalletValue);
  };

  const saveWallet = async () => {
    if (wallet) {
      toast.promise(
        addWallet(wallet),
        {
          loading: 'Saving...',
          success: <p className='p-2 text-secondary font-semibold'>Wallet submited</p>,
          error: <p className='p-2 text-red-400 font-semibold'>Something went wrong</p>,
        }
      );
    }
    else console.log('agrega')
  }

  return (
    <div className='h-screen relative' style={{ backgroundImage: 'url(/hero-background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <Navbar onAboutClick={() => setShowWhitepaperModal(true)} />
      <div className='flex flex-col lg lg:flex-row padingContainer lg:justify-between mt-8 lg:mt-16 gap-8 lg:gap-0'>
        <div className='lg:w-[40%] flex flex-col gap-6 lg:gap-12'>
          <h1 className='text-green-700 text-5xl sm:text-6xl xls:text-8xl font-bold textBorder'>XMAS PUMPFUN <br /> RACE</h1>
          <div className='bg-black/50 backdrop-blur-sm rounded-xl p-4 w-fit'>
            <p className='text-white xl:text-lg xls:text-2xl font-bold'>🎄 Welcome to XMAS Pumpfun Race <br /> The most thrilling holiday racing experience you've ever seen!</p>
          </div>
          <div className='flex gap-4'>
            <ButtonC title='START THE RACE' link='/race'></ButtonC>
          </div>
        </div>
      </div>
      
      <WhitepaperModal isOpen={showWhitepaperModal} onClose={() => setShowWhitepaperModal(false)} />
    </div>
  )
}

export default TopSide
