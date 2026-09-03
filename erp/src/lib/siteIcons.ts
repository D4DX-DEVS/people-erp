// Curated Lucide icon set for the public website (sections, cards, stats,
// counters, values). Icons are stored by their kebab-case Lucide name.
import {
  // People & community
  Users, User, UsersRound, HeartHandshake, Handshake, HandHeart, HandHelping, Baby, PersonStanding,
  Smile, Accessibility, Footprints,
  // Care & health
  Heart, HeartPulse, Stethoscope, Hospital, Pill, Syringe, Ambulance, Activity, Cross, Bed, LifeBuoy, Siren,
  // Education
  GraduationCap, BookOpen, Book, School, Library, Pencil, PenTool, Lightbulb, Brain, Palette, Puzzle,
  // Home & infrastructure
  Home, HousePlus, Building, Building2, Hammer, Wrench, Landmark, Church, Store, Warehouse, Factory, Tent, Sofa, Lamp,
  // Livelihood & finance
  Briefcase, Banknote, Coins, Wallet, PiggyBank, HandCoins, IndianRupee, CircleDollarSign, TrendingUp, BarChart3,
  PieChart, ShoppingBag, Package, Gift, Shirt, Tractor, Percent,
  // Food, water & environment
  Utensils, Soup, Wheat, Apple, Carrot, Milk, CookingPot, Droplet, Droplets, Leaf, Sprout, Flower, Trees, TreePine,
  Sun, CloudRain, Umbrella, Recycle, Earth, Mountain, Waves,
  // Relief & mobility
  Shield, Flame, Zap, Truck, Bus, Car, Bike, MapPin, Map as MapIcon, Compass, Anchor, Flag,
  // Achievements
  Award, Trophy, Medal, Star, Ribbon, BadgeCheck, CheckCircle2, ThumbsUp, Target, Rocket, Sparkles,
  Infinity as InfinityIcon,
  // Communication & misc
  Megaphone, Mic, Mail, MessageCircle, Send, Bell, Phone, Globe, Camera, Video, Music, Calendar, Clock,
  Link as LinkIcon, Layers, Boxes, Settings, Scale, Gavel, Eye, Cake, Bird, Dog, Cat, Fish,
  type LucideIcon,
} from "lucide-react";

export interface SiteIcon {
  /** Kebab-case Lucide name — the value that gets stored. */
  name: string;
  label: string;
  Icon: LucideIcon;
  keywords?: string;
}

export interface SiteIconGroup {
  label: string;
  icons: SiteIcon[];
}

const icon = (name: string, label: string, Icon: LucideIcon, keywords = ""): SiteIcon => ({ name, label, Icon, keywords });

export const SITE_ICON_GROUPS: SiteIconGroup[] = [
  {
    label: "People & community",
    icons: [
      icon("users", "People", Users, "community group beneficiaries"),
      icon("user", "Person", User),
      icon("users-round", "Team", UsersRound, "members"),
      icon("heart-handshake", "Care & support", HeartHandshake, "partnership"),
      icon("handshake", "Partnership", Handshake, "agreement"),
      icon("hand-heart", "Helping hands", HandHeart, "volunteer charity"),
      icon("hand-helping", "Helping hand", HandHelping, "support"),
      icon("baby", "Child", Baby, "children infant"),
      icon("person-standing", "Individual", PersonStanding),
      icon("smile", "Happiness", Smile, "wellbeing"),
      icon("accessibility", "Accessibility", Accessibility, "disability inclusion"),
      icon("footprints", "Journey", Footprints, "steps"),
    ],
  },
  {
    label: "Care & health",
    icons: [
      icon("heart", "Heart", Heart, "love care"),
      icon("heart-pulse", "Health", HeartPulse, "medical"),
      icon("stethoscope", "Medical care", Stethoscope, "doctor health"),
      icon("hospital", "Hospital", Hospital, "clinic"),
      icon("pill", "Medicine", Pill, "pharmacy"),
      icon("syringe", "Vaccination", Syringe),
      icon("ambulance", "Ambulance", Ambulance, "emergency"),
      icon("activity", "Activity", Activity, "pulse"),
      icon("cross", "Aid", Cross, "first aid"),
      icon("bed", "Shelter bed", Bed, "rest"),
      icon("life-buoy", "Rescue", LifeBuoy, "help"),
      icon("siren", "Emergency", Siren, "alert"),
    ],
  },
  {
    label: "Education",
    icons: [
      icon("graduation-cap", "Graduation", GraduationCap, "education student"),
      icon("book-open", "Learning", BookOpen, "study"),
      icon("book", "Book", Book),
      icon("school", "School", School),
      icon("library", "Library", Library),
      icon("pencil", "Writing", Pencil),
      icon("pen-tool", "Design", PenTool),
      icon("lightbulb", "Idea", Lightbulb, "innovation"),
      icon("brain", "Knowledge", Brain, "mental health"),
      icon("palette", "Arts", Palette, "creative"),
      icon("puzzle", "Skills", Puzzle, "training"),
    ],
  },
  {
    label: "Home & infrastructure",
    icons: [
      icon("home", "Home", Home, "house shelter housing"),
      icon("house-plus", "New home", HousePlus, "rehabilitation"),
      icon("building", "Building", Building),
      icon("building-2", "Office", Building2, "institution"),
      icon("hammer", "Construction", Hammer, "build"),
      icon("wrench", "Repair", Wrench, "maintenance"),
      icon("landmark", "Institution", Landmark, "government bank"),
      icon("church", "Place of worship", Church),
      icon("store", "Shop", Store, "market"),
      icon("warehouse", "Warehouse", Warehouse, "storage"),
      icon("factory", "Industry", Factory),
      icon("tent", "Camp", Tent, "relief camp"),
      icon("sofa", "Furniture", Sofa),
      icon("lamp", "Electricity", Lamp, "light"),
    ],
  },
  {
    label: "Livelihood & finance",
    icons: [
      icon("briefcase", "Employment", Briefcase, "job livelihood work"),
      icon("banknote", "Funds", Banknote, "money cash"),
      icon("coins", "Coins", Coins, "savings"),
      icon("wallet", "Wallet", Wallet, "income"),
      icon("piggy-bank", "Savings", PiggyBank),
      icon("hand-coins", "Donation", HandCoins, "giving"),
      icon("indian-rupee", "Rupee", IndianRupee, "money"),
      icon("circle-dollar-sign", "Dollar", CircleDollarSign),
      icon("trending-up", "Growth", TrendingUp, "progress"),
      icon("bar-chart-3", "Statistics", BarChart3, "chart"),
      icon("pie-chart", "Share", PieChart, "chart"),
      icon("shopping-bag", "Shopping", ShoppingBag),
      icon("package", "Supplies", Package, "kit distribution"),
      icon("gift", "Gift", Gift, "donation"),
      icon("shirt", "Clothing", Shirt),
      icon("tractor", "Farming", Tractor, "agriculture"),
      icon("percent", "Percent", Percent),
    ],
  },
  {
    label: "Food, water & environment",
    icons: [
      icon("utensils", "Food", Utensils, "meals nutrition"),
      icon("soup", "Meals", Soup, "kitchen"),
      icon("wheat", "Grain", Wheat, "agriculture"),
      icon("apple", "Nutrition", Apple, "fruit"),
      icon("carrot", "Vegetables", Carrot),
      icon("milk", "Milk", Milk, "dairy"),
      icon("cooking-pot", "Cooking", CookingPot, "kitchen"),
      icon("droplet", "Water", Droplet, "drinking water"),
      icon("droplets", "Sanitation", Droplets, "hygiene"),
      icon("leaf", "Nature", Leaf, "green"),
      icon("sprout", "Growth", Sprout, "plant"),
      icon("flower", "Flower", Flower),
      icon("trees", "Forest", Trees, "planting"),
      icon("tree-pine", "Tree", TreePine),
      icon("sun", "Solar", Sun, "energy"),
      icon("cloud-rain", "Rain", CloudRain, "monsoon flood"),
      icon("umbrella", "Protection", Umbrella, "insurance"),
      icon("recycle", "Recycling", Recycle, "waste"),
      icon("earth", "Earth", Earth, "planet global"),
      icon("mountain", "Mountain", Mountain, "landslide"),
      icon("waves", "Water body", Waves, "flood sea"),
    ],
  },
  {
    label: "Relief & mobility",
    icons: [
      icon("shield", "Safety", Shield, "protection"),
      icon("flame", "Fire", Flame),
      icon("zap", "Energy", Zap, "power"),
      icon("truck", "Transport", Truck, "delivery logistics"),
      icon("bus", "Bus", Bus),
      icon("car", "Car", Car),
      icon("bike", "Bicycle", Bike),
      icon("map-pin", "Location", MapPin, "place"),
      icon("map", "Map", MapIcon, "region"),
      icon("compass", "Direction", Compass, "guidance"),
      icon("anchor", "Anchor", Anchor, "stability"),
      icon("flag", "Flag", Flag, "milestone"),
    ],
  },
  {
    label: "Achievements",
    icons: [
      icon("award", "Award", Award, "recognition"),
      icon("trophy", "Trophy", Trophy, "winner"),
      icon("medal", "Medal", Medal),
      icon("star", "Star", Star, "excellence"),
      icon("ribbon", "Ribbon", Ribbon, "awareness"),
      icon("badge-check", "Verified", BadgeCheck, "certified"),
      icon("check-circle-2", "Completed", CheckCircle2, "done"),
      icon("thumbs-up", "Approval", ThumbsUp),
      icon("target", "Goal", Target, "mission"),
      icon("rocket", "Launch", Rocket, "growth"),
      icon("sparkles", "Highlight", Sparkles, "new"),
      icon("infinity", "Infinity", InfinityIcon, "endless"),
    ],
  },
  {
    label: "Communication & more",
    icons: [
      icon("megaphone", "Announcement", Megaphone, "campaign"),
      icon("mic", "Microphone", Mic, "speech"),
      icon("mail", "Email", Mail),
      icon("message-circle", "Message", MessageCircle, "chat"),
      icon("send", "Send", Send),
      icon("bell", "Notification", Bell),
      icon("phone", "Phone", Phone, "call"),
      icon("globe", "Global", Globe, "website world"),
      icon("camera", "Photo", Camera, "gallery"),
      icon("video", "Video", Video),
      icon("music", "Music", Music, "culture"),
      icon("calendar", "Calendar", Calendar, "event"),
      icon("clock", "Time", Clock, "hours"),
      icon("link", "Link", LinkIcon),
      icon("layers", "Layers", Layers, "programs"),
      icon("boxes", "Resources", Boxes),
      icon("settings", "Settings", Settings, "operations"),
      icon("scale", "Justice", Scale, "legal rights"),
      icon("gavel", "Law", Gavel, "legal"),
      icon("eye", "Vision", Eye),
      icon("cake", "Celebration", Cake, "birthday"),
      icon("bird", "Bird", Bird),
      icon("dog", "Dog", Dog, "animal"),
      icon("cat", "Cat", Cat, "animal"),
      icon("fish", "Fish", Fish, "fisheries"),
    ],
  },
];

const ICON_BY_NAME: Record<string, SiteIcon> = {};
for (const group of SITE_ICON_GROUPS) for (const i of group.icons) ICON_BY_NAME[i.name] = i;

/** Names used by older content before the picker existed. */
const LEGACY_ALIASES: Record<string, string> = {
  education: "graduation-cap",
  graduation: "graduation-cap",
  housing: "home",
  livelihood: "briefcase",
  health: "stethoscope",
  healthcare: "stethoscope",
  hands: "hand-heart",
  book: "book-open",
  chart: "bar-chart-3",
  check: "check-circle-2",
};

export function findSiteIcon(name?: string): SiteIcon | undefined {
  const key = (name || "").trim().toLowerCase();
  if (!key) return undefined;
  return ICON_BY_NAME[key] || ICON_BY_NAME[LEGACY_ALIASES[key]];
}

/** Icon component for a stored name; unknown or empty names fall back to Sparkles. */
export function resolveIcon(name?: string): LucideIcon {
  return findSiteIcon(name)?.Icon || Sparkles;
}
