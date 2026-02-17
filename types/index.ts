export enum PlasticCategory {
  ABS = "ABS",
  HDPE = "HDPE", // Corrected user's 'HPE' typo
  LDPE = "LDPE",
  PET = "PET",
  PVC = "PVC",
  PP = "PP",
  PS = "PS",
}

export enum MetalCategory {
  COPPER = "Copper",
  ALUMINUM = "Aluminium", // Note: User requested "Aluminium" spellings
  BRASS = "Brass",
  STAINLESS_STEEL = "Stainless Steel",
  LEAD = "Lead",
  ZINC = "Zinc",
  IRON_STEEL = "Iron & Steel",
  E_SCRAP = "E-Scrap",
  MAGNESIUM = "Magnesium",
  MIXED = "Mixed",
}

export type MaterialCategory = PlasticCategory | MetalCategory;

export enum MaterialType {
  PLASTIC = "Plastic",
  METAL = "Metal",
}

// Material Conditions
export enum MaterialCondition {
  BALED = "Baled",
  DENSIFIED = "Densified",
  FIBER = "Fiber",
  FILM = "Film",
  FLAKE = "Flake",
  LOOSE = "Loose",
  LUMP = "Lump",
  MIXED_RECYCLED = "Mixed Recycled",
  REGRIND = "Regrind",
  REPRO_PELLETS = "Repro Pellets",
  ROLLS = "Rolls",
  WIDE_SPEC_OFF_GRADE = "Wide Spec/Off-Grade",
  SHREDDED = "Shredded",
  TURNINGS = "Turnings",
  CAST = "Cast",
  CLIPPED = "Clipped",
}

// User Interface
export interface User {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
  company?: string;
  location?: string;
  phone?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Listing Interface
export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  materialType: MaterialType;
  category: MaterialCategory;
  condition: MaterialCondition;
  price: number;
  currency: string;
  unit: string;
  images: string[];
  city: string;
  country: string;
  address?: string;
  zip_code?: string;
  location?: string; // Legacy string field support
  status: "active" | "sold" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// Message Interface
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  listingId: string;
  offerId?: string | null;
  content: string;
  read: boolean;
  createdAt: Date;
}
