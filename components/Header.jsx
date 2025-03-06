import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-[#2C2C2C] border-b border-[#3C3C3C] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/minecraft_logo_icon.ico"
                alt="Minecraft Icon"
                width={32}
                height={32}
                className="mr-2"
              />
              <span className="text-xl font-bold text-white">Minecraft Server Control</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 