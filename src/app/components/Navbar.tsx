import React from 'react'
import { Emblema_One } from 'next/font/google'
import { BsTwitterX } from "react-icons/bs";
import Link from 'next/link';

const emblema = Emblema_One({ subsets: ['latin'], weight: '400' })

interface NavbarProps {
  onAboutClick?: () => void;
}

const Navbar = ({ onAboutClick }: NavbarProps) => {
  return (
    <nav className='font-bold text-sm py-4 border-b-8 border-b-green-800 flex flex-row items-center bg-green-500 paddingX gap-4'>
      <div className='flex justify-start items-center'>
        <img src="./ppraceLogo.png" alt="XMAS Pumpfun Racing Logo" className='w-[80px]' />
      </div>
      <div className='flex text-xs md:text-xl items-center justify-center md:gap-16 gap-2 text-white ml-auto'>
        <div className='group flex flex-col'>
          <button 
            onClick={onAboutClick}
            className='items-center gap-2 group cursor-pointer hover:text-green-200 transition-colors'
          >
            Whitepaper
          </button>
          <div className='h-2 bg-green-300 w-full ease-in-out duration-300 rounded-sm'></div>
        </div>
        <a href='https://dexscreener.com/solana/55PRPBCT2RmWuvG2tr8bdUfffoNLPXqvJHZ9aJ8Mpump' target='_blank' rel='noopener noreferrer' className='bg-green-900 px-4 py-2 rounded-full hover:bg-green-800 transition-colors'>
          DEXSCREENER
        </a>
        <a href='https://x.com/xmaspfrace' target='_blank' rel='noopener noreferrer' className='h-full rounded-full border-2 border-white p-2'>
          <BsTwitterX></BsTwitterX>
        </a>
      </div>
    </nav>
  )
}

export default Navbar
