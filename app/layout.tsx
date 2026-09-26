import './globals.css';
import { Manrope, IBM_Plex_Sans_Arabic } from 'next/font/google';

const manrope=Manrope({subsets:['latin'],variable:'--font-en',display:'swap'});
const ibmArabic=IBM_Plex_Sans_Arabic({subsets:['arabic'],weight:['400','500','600','700'],variable:'--font-ar',display:'swap'});

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html><body className={`${manrope.variable} ${ibmArabic.variable}`}>{children}</body></html>
}