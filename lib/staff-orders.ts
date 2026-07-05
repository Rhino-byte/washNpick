import type { ApiStaffOrderListItem } from "@/lib/api";
import { getNextOrderStatus } from "@/lib/order-types";

export function findNextActionableOrder(
  orders: ApiStaffOrderListItem[],
  afterId: string,
): ApiStaffOrderListItem | null {
  const startIdx = orders.findIndex((o) => o.id === afterId);
  if (startIdx === -1) {
    return orders.find((o) => getNextOrderStatus(o.status) !== null) ?? null;
  }

  const scan = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      if (getNextOrderStatus(orders[i].status) !== null) {
        return orders[i];
      }
    }
    return null;
  };

  return scan(startIdx + 1, orders.length) ?? scan(0, startIdx);
}

export function isActionableOrder(order: ApiStaffOrderListItem): boolean {
  return getNextOrderStatus(order.status) !== null;
}
