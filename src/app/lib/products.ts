// src/app/lib/products.ts — Shared product catalogue data

import type { CatalogId } from './catalog';
import gotyImage from '../../assets/GOTY_TIER.jpg';
import mvpImage from '../../assets/MVP_TIER.jpg';
import premiumImage from '../../assets/premium_rdk.jpg';
import forzaImage from '../../assets/foriza_horizon6_rdk.jpg';
import firstlightImage from '../../assets/firstlight007_rdk.jpg';
import gothicImage from '../../assets/gothic1_remake_rdk.jpg';
import cyberpunkImage from '../../assets/cyberpunk2077.jpg';
import eldenRingImage from '../../assets/elden_ring.jpg';
import gtaVImage from '../../assets/gta_v.jpg';
import rdr2Image from '../../assets/red_dead_redemption_2.jpg';
import witcher3Image from '../../assets/the_witcher_3.jpg';
import baldursGate3Image from '../../assets/baldurs_gate_3.jpg';
import steamGiftCard from '../../assets/giftcard/steam_giftcard.jpg';
import amazonGiftCard from '../../assets/giftcard/amazon_giftcard.jpg';
import psGiftCard from '../../assets/giftcard/ps_giftcard.jpg';
import googlePlayGiftCard from '../../assets/giftcard/googleplay_giftcard.jpg';
import appleGiftCard from '../../assets/giftcard/apple_giftcard.jpg';
import netflixGiftCard from '../../assets/giftcard/netflix_giftcard.jpg';
import xboxUltimateImg from '../../assets/Subscriptions/xbox_ultimate.jpg';
import psExtraImg from '../../assets/Subscriptions/ps_plus_extra_year.jpg';
import spotifyImg from '../../assets/Subscriptions/spotify_half_year.jpg';
import switchOnlineImg from '../../assets/Subscriptions/switch_online_year.jpg';
import eaProImg from '../../assets/Subscriptions/ea_pro_month.jpg';
import discordNitroImg from '../../assets/Subscriptions/discord_nitro_year.jpg';
export interface ProductItem {
  id: string;
  title: string;
  platform: string;
  price: number;
  origPrice?: number;
  discount?: number;
  image: string;
  badge: string;
  badgeColor?: string;
  catalog: Exclude<CatalogId, 'all'>;
  type: 'random-key' | 'hot-deal' | 'catalog';
  game?: string;
  gameColor?: string;
  region?: string;
  activationCountry?: string;
  rating?: number;
  reviews?: number;
  recommend?: number;
  seller?: string;
  sellerRating?: number;
  sellerSales?: string;
  description?: string;
  screenshots?: string[];
}

export const RANDOM_KEYS: ProductItem[] = [
  {
    id: 'rk-0',
    type: 'random-key',
    catalog: 'random-weekend',
    title: 'GOTY TIER Random 1 Key by GamingXou',
    platform: 'Steam · Key',
    price: 2.99,
    badge: 'SPONSORED',
    image: gotyImage,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.8,
    reviews: 1247,
    recommend: 96,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '12,847',
    description: 'Take a leap into greatness with this GOTY Tier Random Key — where every activation could unlock a top gaming masterpiece! This premium random key gives you a chance to receive one of the most acclaimed Game of the Year titles. Open the pack and discover your next favourite game!',
    screenshots: [
      gotyImage,
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80',
    ],
  },
  {
    id: 'rk-1',
    type: 'random-key',
    catalog: 'random-weekend',
    title: 'MVP Random by Gamingyou: 1 Key PC',
    platform: 'Steam · Key',
    price: 3.49,
    badge: 'SPONSORED',
    image: mvpImage,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.6,
    reviews: 854,
    recommend: 93,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '8,391',
    description: 'Unlock an MVP-tier gaming experience with this exclusive random key! Each key has a chance to reveal a top-rated multiplayer game. Perfect for players who love competitive titles and want to try their luck at scoring a rare gem.',
    screenshots: [
      mvpImage,
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80',
    ],
  },
  {
    id: 'rk-2',
    type: 'random-key',
    catalog: 'random-weekend',
    title: 'Bestsellers Random Premium 1 Key PC',
    platform: 'Steam · Key',
    price: 4.99,
    badge: 'SPONSORED',
    image: premiumImage,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.9,
    reviews: 3102,
    recommend: 97,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '31,074',
    description: 'Get a Bestseller Random Premium Key and unlock a game from the top-selling charts. With this key you stand a chance to receive one of Steam\'s top 100 best-selling games. Only premium titles guaranteed — no shovelware here!',
    screenshots: [
      premiumImage,
      'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&q=80',
    ],
  },
  {
    id: 'rk-3',
    type: 'random-key',
    catalog: 'random-weekend',
    title: 'Try to Get Forza Horizon 6 - Random...',
    platform: 'Steam · Key',
    price: 1.99,
    badge: 'OFFERS FROM 7 SELLERS',
    badgeColor: '#7c3aed',
    image: forzaImage,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.4,
    reviews: 421,
    recommend: 88,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '4,218',
    description: 'Try your luck with this Random Key for a chance to unlock Forza Horizon 6! Your key might reveal the most anticipated racing game of the year. Multiple sellers offer competitive prices — pick your best deal.',
    screenshots: [
      forzaImage,
    ],
  },
  {
    id: 'rk-4',
    type: 'random-key',
    catalog: 'random-weekend',
    title: 'Try to Get 007 First Light - Random...',
    platform: 'Steam · Key',
    price: 2.49,
    badge: 'OFFERS FROM 5 SELLERS',
    badgeColor: '#7c3aed',
    image: firstlightImage,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.3,
    reviews: 198,
    recommend: 85,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '2,663',
    description: 'Unlock the iconic spy world with this 007 First Light Random Key. This key gives you a chance to get the newest Bond adventure. Redeem on Steam and dive into the ultimate espionage experience.',
    screenshots: [
      firstlightImage,
    ],
  },
  {
    id: 'rk-5',
    type: 'random-key',
    catalog: 'random-weekend',
    title: 'Try to Get Gothic 1 Remake - Random 1...',
    platform: 'Steam · Key',
    price: 1.49,
    badge: 'OFFERS FROM 3 SELLERS',
    badgeColor: '#7c3aed',
    image: gothicImage,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.5,
    reviews: 312,
    recommend: 90,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '3,509',
    description: 'Experience the legendary Gothic 1 reimagined. This random key gives you the chance to unlock the full Gothic 1 Remake on Steam. Explore the penal colony of Khorinis with modern graphics and gameplay.',
    screenshots: [
      gothicImage,
    ],
  },
];

export const HOT_DEALS: ProductItem[] = [
  {
    id: 'hd-0',
    type: 'hot-deal',
    catalog: 'steam-game-keys',
    title: 'Cyberpunk 2077',
    platform: 'Steam · PC',
    price: 9.99,
    origPrice: 39.99,
    discount: 75,
    badge: '-75%',
    badgeColor: '#ef4444',
    image: cyberpunkImage,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.7,
    reviews: 15420,
    recommend: 94,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '58,341',
    description: 'Cyberpunk 2077 is an open-world, action-adventure RPG set in the megalopolis of Night City, where you play as a cyberpunk mercenary wrapped up in a do-or-die fight for survival. Improved and expanded with the 2.0 update and Phantom Liberty DLC.',
    screenshots: [
      cyberpunkImage,
    ],
  },
  {
    id: 'hd-1',
    type: 'hot-deal',
    catalog: 'steam-game-keys',
    title: 'Elden Ring',
    platform: 'Steam · PC',
    price: 35.99,
    origPrice: 59.99,
    discount: 40,
    badge: '-40%',
    badgeColor: '#ef4444',
    image: eldenRingImage,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.9,
    reviews: 48211,
    recommend: 98,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '104,762',
    description: 'Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between. A vast world full of excitement awaits you. FromSoftware\'s landmark open-world action RPG.',
    screenshots: [
      eldenRingImage,
    ],
  },
  {
    id: 'hd-2',
    type: 'hot-deal',
    catalog: 'gaming',
    title: 'GTA V Premium',
    platform: 'Rockstar · PC',
    price: 11.99,
    origPrice: 29.99,
    discount: 60,
    badge: '-60%',
    badgeColor: '#ef4444',
    image: gtaVImage,
    game: 'Rockstar',
    gameColor: '#d4a017',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.6,
    reviews: 32100,
    recommend: 91,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '87,093',
    description: 'Grand Theft Auto V Premium Edition includes the complete GTAV story experience, Grand Theft Auto Online and all existing gameplay upgrades and content. Explore the streets of Los Santos and Blaine County in style.',
    screenshots: [
      gtaVImage,
    ],
  },
  {
    id: 'hd-3',
    type: 'hot-deal',
    catalog: 'steam-game-keys',
    title: 'Red Dead Redemption 2',
    platform: 'Steam · PC',
    price: 29.99,
    origPrice: 59.99,
    discount: 50,
    badge: '-50%',
    badgeColor: '#ef4444',
    image: rdr2Image,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.9,
    reviews: 28540,
    recommend: 97,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '73,158',
    description: 'America, 1899. The end of the Wild West era has begun. After a robbery goes badly wrong in the western town of Blackwater, Arthur Morgan and the Van der Linde gang are forced to flee. An epic tale of life in America\'s unforgiving heartland.',
    screenshots: [
      rdr2Image,
    ],
  },
  {
    id: 'hd-4',
    type: 'hot-deal',
    catalog: 'steam-game-keys',
    title: 'The Witcher 3: Wild Hunt',
    platform: 'Steam · PC',
    price: 8.99,
    origPrice: 29.99,
    discount: 70,
    badge: '-70%',
    badgeColor: '#ef4444',
    image: witcher3Image,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.9,
    reviews: 67800,
    recommend: 99,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '134,520',
    description: 'You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will. Your current contract? Tracking down the Child of Prophecy, a living weapon that can alter the shape of the world.',
    screenshots: [
      witcher3Image,
    ],
  },
  {
    id: 'hd-5',
    type: 'hot-deal',
    catalog: 'steam-game-keys',
    title: "Baldur's Gate 3",
    platform: 'Steam · PC',
    price: 47.99,
    origPrice: 59.99,
    discount: 20,
    badge: '-20%',
    badgeColor: '#ef4444',
    image: baldursGate3Image,
    game: 'Steam',
    gameColor: '#1b2838',
    region: 'GLOBAL',
    activationCountry: 'Vietnam & most countries',
    rating: 4.9,
    reviews: 92300,
    recommend: 99,
    seller: 'Admin',
    sellerRating: 99.8,
    sellerSales: '119,847',
    description: 'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power. An epic RPG based on the Dungeons & Dragons tabletop role-playing game.',
    screenshots: [
      baldursGate3Image,
    ],
  },
];

const softwareImg = 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&q=80';
const subImg = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80';
const giftImg = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
const outletImg = 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&q=80';

export const SOFTWARE_PRODUCTS: ProductItem[] = [
  {
    id: 'sw-0', type: 'catalog', catalog: 'software', title: 'Microsoft Office 2021 Home & Business',
    platform: 'Windows · Key', price: 49.99, origPrice: 249.99, discount: 80, badge: '-80%', badgeColor: '#ef4444',
    image: softwareImg, game: 'Microsoft', gameColor: '#0078d4', region: 'GLOBAL',
    rating: 4.7, reviews: 8420, recommend: 95, seller: 'Admin', sellerRating: 99.8, sellerSales: '22,104',
  },
  {
    id: 'sw-1', type: 'catalog', catalog: 'software', title: 'Windows 11 Pro',
    platform: 'Windows · Key', price: 19.99, origPrice: 199.99, discount: 90, badge: '-90%', badgeColor: '#ef4444',
    image: softwareImg, game: 'Microsoft', gameColor: '#0078d4', region: 'GLOBAL',
    rating: 4.8, reviews: 12400, recommend: 97, seller: 'Admin', sellerRating: 99.8, sellerSales: '41,882',
  },
  {
    id: 'sw-2', type: 'catalog', catalog: 'software', title: 'Adobe Creative Cloud 1 Month',
    platform: 'Adobe · Account', price: 24.99, origPrice: 54.99, discount: 55, badge: '-55%', badgeColor: '#ef4444',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80', game: 'Adobe', gameColor: '#ff0000', region: 'GLOBAL',
    rating: 4.5, reviews: 2100, recommend: 91, seller: 'Admin', sellerRating: 99.5, sellerSales: '6,441',
  },
  {
    id: 'sw-3', type: 'catalog', catalog: 'software', title: 'Norton 360 Deluxe 1 Year',
    platform: 'Multi-device · Key', price: 14.99, origPrice: 49.99, discount: 70, badge: '-70%', badgeColor: '#ef4444',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80', game: 'Norton', gameColor: '#f4c430', region: 'GLOBAL',
    rating: 4.4, reviews: 980, recommend: 89, seller: 'Admin', sellerRating: 99.2, sellerSales: '3,218',
  },
  {
    id: 'sw-4', type: 'catalog', catalog: 'software', title: 'Parallels Desktop 20',
    platform: 'Mac · Key', price: 39.99, origPrice: 99.99, discount: 60, badge: '-60%', badgeColor: '#ef4444',
    image: softwareImg, game: 'Parallels', gameColor: '#0066cc', region: 'GLOBAL',
    rating: 4.6, reviews: 540, recommend: 92, seller: 'Admin', sellerRating: 99.6, sellerSales: '1,904',
  },
  {
    id: 'sw-5', type: 'catalog', catalog: 'software', title: 'CorelDRAW Graphics Suite 2024',
    platform: 'Windows · Key', price: 89.99, origPrice: 499.00, discount: 82, badge: '-82%', badgeColor: '#ef4444',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', game: 'Corel', gameColor: '#00a651', region: 'GLOBAL',
    rating: 4.5, reviews: 312, recommend: 90, seller: 'Admin', sellerRating: 99.4, sellerSales: '887',
  },
];

export const SUBSCRIPTION_PRODUCTS: ProductItem[] = [
  {
    id: 'sub-0', type: 'catalog', catalog: 'subscriptions', title: 'Xbox Game Pass Ultimate 3 Months',
    platform: 'Xbox · Code', price: 29.99, origPrice: 44.99, discount: 33, badge: '-33%', badgeColor: '#ef4444',
    image: xboxUltimateImg, game: 'Xbox', gameColor: '#107c10', region: 'GLOBAL',
    rating: 4.9, reviews: 18200, recommend: 98, seller: 'Admin', sellerRating: 99.8, sellerSales: '54,210',
  },
  {
    id: 'sub-1', type: 'catalog', catalog: 'subscriptions', title: 'PlayStation Plus Extra 12 Months',
    platform: 'PlayStation · Code', price: 79.99, origPrice: 119.99, discount: 33, badge: '-33%', badgeColor: '#ef4444',
    image: psExtraImg, game: 'PlayStation', gameColor: '#003791', region: 'GLOBAL',
    rating: 4.8, reviews: 9400, recommend: 96, seller: 'Admin', sellerRating: 99.7, sellerSales: '28,441',
  },
  {
    id: 'sub-2', type: 'catalog', catalog: 'subscriptions', title: 'Spotify Premium 6 Months',
    platform: 'Spotify · Code', price: 34.99, origPrice: 59.94, discount: 42, badge: '-42%', badgeColor: '#ef4444',
    image: spotifyImg, game: 'Spotify', gameColor: '#1db954', region: 'GLOBAL',
    rating: 4.7, reviews: 6200, recommend: 94, seller: 'Admin', sellerRating: 99.5, sellerSales: '19,882',
  },
  {
    id: 'sub-3', type: 'catalog', catalog: 'subscriptions', title: 'Nintendo Switch Online 12 Months',
    platform: 'Nintendo · Code', price: 14.99, origPrice: 19.99, discount: 25, badge: '-25%', badgeColor: '#ef4444',
    image: switchOnlineImg, game: 'Nintendo', gameColor: '#e60012', region: 'GLOBAL',
    rating: 4.6, reviews: 4100, recommend: 93, seller: 'Admin', sellerRating: 99.6, sellerSales: '11,204',
  },
  {
    id: 'sub-4', type: 'catalog', catalog: 'subscriptions', title: 'EA Play Pro 1 Month',
    platform: 'Origin · Code', price: 9.99, origPrice: 14.99, discount: 33, badge: '-33%', badgeColor: '#ef4444',
    image: eaProImg, game: 'EA', gameColor: '#000000', region: 'GLOBAL',
    rating: 4.4, reviews: 1800, recommend: 88, seller: 'Admin', sellerRating: 99.3, sellerSales: '4,992',
  },
  {
    id: 'sub-5', type: 'catalog', catalog: 'subscriptions', title: 'Discord Nitro 1 Year',
    platform: 'Discord · Code', price: 49.99, origPrice: 99.99, discount: 50, badge: '-50%', badgeColor: '#ef4444',
    image: discordNitroImg, game: 'Discord', gameColor: '#5865f2', region: 'GLOBAL',
    rating: 4.8, reviews: 3200, recommend: 95, seller: 'Admin', sellerRating: 99.7, sellerSales: '8,441',
  },
];

export const GIFT_CARD_PRODUCTS: ProductItem[] = [
  {
    id: 'gc-0', type: 'catalog', catalog: 'gift-cards', title: 'Steam Wallet $20',
    platform: 'Steam · Gift Card', price: 18.99, badge: 'INSTANT', badgeColor: '#1a6fd4',
    image: steamGiftCard, game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.9, reviews: 28400, recommend: 99, seller: 'Admin', sellerRating: 99.9, sellerSales: '102,441',
  },
  {
    id: 'gc-1', type: 'catalog', catalog: 'gift-cards', title: 'Amazon Gift Card $50',
    platform: 'Amazon · Gift Card', price: 47.50, badge: 'POPULAR', badgeColor: '#f59e0b',
    image: amazonGiftCard, game: 'Amazon', gameColor: '#ff9900', region: 'US',
    rating: 4.8, reviews: 9200, recommend: 97, seller: 'Admin', sellerRating: 99.8, sellerSales: '38,210',
  },
  {
    id: 'gc-2', type: 'catalog', catalog: 'gift-cards', title: 'PlayStation Store $25',
    platform: 'PlayStation · Gift Card', price: 23.99, badge: 'INSTANT', badgeColor: '#1a6fd4',
    image: psGiftCard, game: 'PlayStation', gameColor: '#003791', region: 'GLOBAL',
    rating: 4.7, reviews: 6400, recommend: 96, seller: 'Admin', sellerRating: 99.7, sellerSales: '24,882',
  },
  {
    id: 'gc-3', type: 'catalog', catalog: 'gift-cards', title: 'Google Play $15',
    platform: 'Google Play · Gift Card', price: 14.25, badge: 'INSTANT', badgeColor: '#1a6fd4',
    image: googlePlayGiftCard, game: 'Google', gameColor: '#4285f4', region: 'GLOBAL',
    rating: 4.8, reviews: 5100, recommend: 95, seller: 'Admin', sellerRating: 99.6, sellerSales: '18,441',
  },
  {
    id: 'gc-4', type: 'catalog', catalog: 'gift-cards', title: 'Apple App Store & iTunes $30',
    platform: 'Apple · Gift Card', price: 28.99, badge: 'INSTANT', badgeColor: '#1a6fd4',
    image: appleGiftCard, game: 'Apple', gameColor: '#555555', region: 'GLOBAL',
    rating: 4.7, reviews: 3800, recommend: 94, seller: 'Admin', sellerRating: 99.5, sellerSales: '12,104',
  },
  {
    id: 'gc-5', type: 'catalog', catalog: 'gift-cards', title: 'Netflix Gift Card $25',
    platform: 'Netflix · Gift Card', price: 24.50, badge: 'GIFT', badgeColor: '#e50914',
    image: netflixGiftCard, game: 'Netflix', gameColor: '#e50914', region: 'GLOBAL',
    rating: 4.6, reviews: 2900, recommend: 92, seller: 'Admin', sellerRating: 99.4, sellerSales: '9,882',
  },
];

export const OUTLET_PRODUCTS: ProductItem[] = [
  {
    id: 'out-0', type: 'catalog', catalog: 'outlet', title: 'Assassin\'s Creed Valhalla',
    platform: 'Steam · Key', price: 7.99, origPrice: 59.99, discount: 87, badge: 'OUTLET', badgeColor: '#7c3aed',
    image: outletImg, game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.5, reviews: 8400, recommend: 90, seller: 'Admin', sellerRating: 99.2, sellerSales: '14,220',
  },
  {
    id: 'out-1', type: 'catalog', catalog: 'outlet', title: 'Far Cry 6',
    platform: 'Steam · Key', price: 5.99, origPrice: 49.99, discount: 88, badge: 'OUTLET', badgeColor: '#7c3aed',
    image: outletImg, game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.3, reviews: 4200, recommend: 86, seller: 'Admin', sellerRating: 99.1, sellerSales: '8,441',
  },
  {
    id: 'out-2', type: 'catalog', catalog: 'outlet', title: 'Watch Dogs Legion',
    platform: 'Steam · Key', price: 4.49, origPrice: 39.99, discount: 89, badge: 'OUTLET', badgeColor: '#7c3aed',
    image: outletImg, game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.1, reviews: 3100, recommend: 82, seller: 'Admin', sellerRating: 99.0, sellerSales: '6,104',
  },
  {
    id: 'out-3', type: 'catalog', catalog: 'outlet', title: 'Tom Clancy\'s Ghost Recon Breakpoint',
    platform: 'Steam · Key', price: 3.99, origPrice: 29.99, discount: 87, badge: 'OUTLET', badgeColor: '#7c3aed',
    image: outletImg, game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.0, reviews: 2800, recommend: 80, seller: 'Admin', sellerRating: 98.9, sellerSales: '5,882',
  },
  {
    id: 'out-4', type: 'catalog', catalog: 'outlet', title: 'Dying Light 2',
    platform: 'Steam · Key', price: 12.99, origPrice: 59.99, discount: 78, badge: 'OUTLET', badgeColor: '#7c3aed',
    image: outletImg, game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.6, reviews: 9200, recommend: 91, seller: 'Admin', sellerRating: 99.3, sellerSales: '11,441',
  },
  {
    id: 'out-5', type: 'catalog', catalog: 'outlet', title: 'Borderlands 3',
    platform: 'Steam · Key', price: 6.49, origPrice: 59.99, discount: 89, badge: 'OUTLET', badgeColor: '#7c3aed',
    image: outletImg, game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.4, reviews: 6100, recommend: 88, seller: 'Admin', sellerRating: 99.1, sellerSales: '7,220',
  },
];

export const GAMING_PRODUCTS: ProductItem[] = [
  {
    id: 'gm-0', type: 'catalog', catalog: 'gaming', title: 'Destiny 2: Lightfall',
    platform: 'Steam · Key', price: 19.99, origPrice: 49.99, discount: 60, badge: '-60%', badgeColor: '#ef4444',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80', game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.5, reviews: 8200, recommend: 89, seller: 'Admin', sellerRating: 99.6, sellerSales: '18,441',
  },
  {
    id: 'gm-1', type: 'catalog', catalog: 'gaming', title: 'LEGO Batman: The Videogame',
    platform: 'Steam · Key', price: 14.99, origPrice: 19.99, discount: 25, badge: '-25%', badgeColor: '#ef4444',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80', game: 'Steam', gameColor: '#1b2838', region: 'GLOBAL',
    rating: 4.7, reviews: 4100, recommend: 93, seller: 'Admin', sellerRating: 99.5, sellerSales: '9,882',
  },
];

export const ALL_PRODUCTS: ProductItem[] = [
  ...RANDOM_KEYS,
  ...HOT_DEALS,
  ...SOFTWARE_PRODUCTS,
  ...SUBSCRIPTION_PRODUCTS,
  ...GIFT_CARD_PRODUCTS,
  ...OUTLET_PRODUCTS,
  ...GAMING_PRODUCTS,
];

export function getProductsByCatalog(catalog: CatalogId): ProductItem[] {
  if (catalog === 'all') return ALL_PRODUCTS;
  return ALL_PRODUCTS.filter(p => p.catalog === catalog);
}

export function getProductById(id: string): ProductItem | undefined {
  return ALL_PRODUCTS.find(p => p.id === id);
}
