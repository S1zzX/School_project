import { ShoppingCart } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface GameCardProps {
  title: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  rating: number;
  image: string;
  genre: string;
}

export function GameCard({ title, price, originalPrice, discount, rating, image, genre }: GameCardProps) {
  const isFree = price === 'Free';

  return (
    <div className="bg-zinc-900 rounded-md overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all duration-200 group cursor-pointer">
      <div className="relative overflow-hidden h-40">
        {image ? (
          <ImageWithFallback
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 grayscale-[15%]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 text-3xl">
            {title.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {discount && (
          <div className="absolute top-2 left-2 bg-lime-400 text-black px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide">
            -{discount}
          </div>
        )}
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button className="bg-lime-400 text-black px-4 py-2 rounded text-sm font-medium flex items-center gap-1.5 hover:bg-lime-300 transition-colors">
            <ShoppingCart className="size-3.5" />
            Add to Cart
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{genre}</span>
          <span className="text-[11px] text-zinc-400">★ {rating}</span>
        </div>
        <h3 className="text-sm text-zinc-100 mb-2 group-hover:text-lime-400 transition-colors truncate">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {originalPrice && (
            <span className="text-zinc-600 line-through text-xs">{originalPrice}</span>
          )}
          <span className={`text-sm font-medium ${isFree ? 'text-lime-400' : 'text-white'}`}>
            {price}
          </span>
        </div>
      </div>
    </div>
  );
}
