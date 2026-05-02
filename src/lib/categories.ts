export type CategoryDef = {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex
  keywords: string[]; // for voice parser
};

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    id: "food",
    name: "Food & Dining",
    icon: "Utensils",
    color: "#f97316",
    keywords: [
      "food",
      "lunch",
      "dinner",
      "breakfast",
      "snack",
      "coffee",
      "tea",
      "restaurant",
      "cafe",
      "pizza",
      "burger",
      "meal",
      "eat",
      "ate",
      "ordered",
      "swiggy",
      "zomato",
      "ubereats",
      "doordash",
    ],
  },
  {
    id: "groceries",
    name: "Groceries",
    icon: "ShoppingBasket",
    color: "#22c55e",
    keywords: ["grocery", "groceries", "supermarket", "vegetables", "fruits", "milk", "bread", "walmart", "kroger", "bigbasket"],
  },
  {
    id: "transport",
    name: "Transport",
    icon: "Car",
    color: "#3b82f6",
    keywords: [
      "uber",
      "lyft",
      "ola",
      "taxi",
      "cab",
      "rickshaw",
      "auto",
      "bus",
      "train",
      "metro",
      "subway",
      "fuel",
      "gas",
      "petrol",
      "diesel",
      "parking",
      "toll",
      "transport",
    ],
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "ShoppingBag",
    color: "#ec4899",
    keywords: ["shopping", "clothes", "shoes", "amazon", "flipkart", "myntra", "shirt", "pants", "dress", "bought"],
  },
  {
    id: "bills",
    name: "Bills & Utilities",
    icon: "Receipt",
    color: "#eab308",
    keywords: ["bill", "electricity", "water", "gas bill", "internet", "wifi", "phone", "rent", "mortgage", "utility"],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "Clapperboard",
    color: "#a855f7",
    keywords: ["movie", "cinema", "netflix", "spotify", "hbo", "concert", "show", "game", "playstation", "steam", "entertainment"],
  },
  {
    id: "health",
    name: "Health",
    icon: "Heart",
    color: "#ef4444",
    keywords: ["doctor", "medicine", "pharmacy", "hospital", "clinic", "medical", "gym", "fitness", "health"],
  },
  {
    id: "education",
    name: "Education",
    icon: "GraduationCap",
    color: "#06b6d4",
    keywords: ["course", "book", "books", "udemy", "coursera", "tuition", "school", "college", "education"],
  },
  {
    id: "travel",
    name: "Travel",
    icon: "Plane",
    color: "#0ea5e9",
    keywords: ["flight", "hotel", "airbnb", "trip", "travel", "vacation", "booking"],
  },
  {
    id: "personal",
    name: "Personal Care",
    icon: "Sparkles",
    color: "#d946ef",
    keywords: ["salon", "haircut", "spa", "beauty", "cosmetics", "skincare"],
  },
  {
    id: "gifts",
    name: "Gifts & Donations",
    icon: "Gift",
    color: "#f43f5e",
    keywords: ["gift", "donation", "charity", "present"],
  },
  {
    id: "other",
    name: "Other",
    icon: "Wallet",
    color: "#71717a",
    keywords: [],
  },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  {
    id: "salary",
    name: "Salary",
    icon: "Briefcase",
    color: "#10b981",
    keywords: ["salary", "paycheck", "wages", "pay"],
  },
  {
    id: "freelance",
    name: "Freelance",
    icon: "Laptop",
    color: "#14b8a6",
    keywords: ["freelance", "client", "contract", "gig", "project"],
  },
  {
    id: "business",
    name: "Business",
    icon: "Store",
    color: "#84cc16",
    keywords: ["business", "sales", "revenue", "shop"],
  },
  {
    id: "investment",
    name: "Investment",
    icon: "TrendingUp",
    color: "#06b6d4",
    keywords: ["dividend", "interest", "investment", "stock", "crypto", "returns"],
  },
  {
    id: "refund",
    name: "Refund",
    icon: "Undo2",
    color: "#0ea5e9",
    keywords: ["refund", "reimbursement", "cashback"],
  },
  {
    id: "gift_in",
    name: "Gift",
    icon: "Gift",
    color: "#f43f5e",
    keywords: ["gift received", "received gift", "got gift"],
  },
  {
    id: "other_income",
    name: "Other",
    icon: "PiggyBank",
    color: "#71717a",
    keywords: [],
  },
];

export function getCategory(id: string): CategoryDef {
  return (
    DEFAULT_CATEGORIES.find((c) => c.id === id) ??
    INCOME_CATEGORIES.find((c) => c.id === id) ??
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
  );
}

export function getCategoriesFor(type: "expense" | "income"): CategoryDef[] {
  return type === "income" ? INCOME_CATEGORIES : DEFAULT_CATEGORIES;
}
