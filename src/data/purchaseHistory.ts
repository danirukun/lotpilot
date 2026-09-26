export interface PurchaseRecord {
  supplier: string;
  orders: number;
  onTimeOrders: number;
  /** ISO date of the most recent order. */
  lastOrder: string;
}

/** Past wholesale orders per store persona, keyed by persona id. */
export const PURCHASE_HISTORY: Record<string, PurchaseRecord[]> = {
  "manchester-football": [
    { supplier: "Terrace Archive (Manchester)", orders: 14, onTimeOrders: 13, lastOrder: "2026-09-02" },
    { supplier: "Rewind Bales (Manchester)", orders: 5, onTimeOrders: 5, lastOrder: "2026-07-21" },
    { supplier: "Northern Grade Co. (Sheffield)", orders: 3, onTimeOrders: 2, lastOrder: "2026-05-09" }
  ],
  "camden-maxgrg": [
    { supplier: "Blue Loop Vintage (Leeds)", orders: 11, onTimeOrders: 11, lastOrder: "2026-08-28" },
    { supplier: "Crosstown Kilo (London)", orders: 6, onTimeOrders: 5, lastOrder: "2026-09-10" },
    { supplier: "Northern Grade Co. (Sheffield)", orders: 2, onTimeOrders: 2, lastOrder: "2026-04-17" }
  ],
  "shoreditch-y2k": [
    { supplier: "Rewind Bales (Manchester)", orders: 9, onTimeOrders: 8, lastOrder: "2026-08-14" },
    { supplier: "Atelier Resale (London)", orders: 3, onTimeOrders: 3, lastOrder: "2026-06-30" },
    { supplier: "Crosstown Kilo (London)", orders: 2, onTimeOrders: 2, lastOrder: "2026-03-11" }
  ],
  "bristol-cottagecore": [
    { supplier: "Petal & Past (Bristol)", orders: 7, onTimeOrders: 7, lastOrder: "2026-09-05" },
    { supplier: "Highland Thread (Glasgow)", orders: 2, onTimeOrders: 2, lastOrder: "2026-02-19" }
  ],
  "leeds-denim": [
    { supplier: "Blue Loop Vintage (Leeds)", orders: 12, onTimeOrders: 12, lastOrder: "2026-09-12" },
    { supplier: "Northern Grade Co. (Sheffield)", orders: 4, onTimeOrders: 3, lastOrder: "2026-07-03" }
  ],
  "london-quietlux": [
    { supplier: "Atelier Resale (London)", orders: 6, onTimeOrders: 6, lastOrder: "2026-08-22" },
    { supplier: "Highland Thread (Glasgow)", orders: 5, onTimeOrders: 5, lastOrder: "2026-07-15" },
    { supplier: "Ivy League Imports (London)", orders: 2, onTimeOrders: 2, lastOrder: "2026-01-27" }
  ],
  "brum-streetwear": [
    { supplier: "Sole Salvage (Birmingham)", orders: 8, onTimeOrders: 6, lastOrder: "2026-08-31" },
    { supplier: "Northern Grade Co. (Sheffield)", orders: 3, onTimeOrders: 3, lastOrder: "2026-06-12" },
    { supplier: "Crosstown Kilo (London)", orders: 2, onTimeOrders: 2, lastOrder: "2026-04-02" }
  ]
};

export const purchaseRecord = (personaId: string | undefined, supplier: string) =>
  personaId ? PURCHASE_HISTORY[personaId]?.find((r) => r.supplier === supplier) : undefined;
