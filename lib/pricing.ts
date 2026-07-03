import type { ServiceDefinition } from "./mock-data";
import type { OrderFormData } from "./order-types";

export function calculateEstimatedTotal(
  data: OrderFormData,
  catalog: ServiceDefinition[],
): number {
  let total = 0;

  for (const selection of data.services) {
    const service = catalog.find((s) => s.id === selection.serviceId);
    if (!service) continue;

    if (service.unit === "kg") {
      total += service.pricePerUnit * data.estimatedWeightKg;
    } else if (service.unit === "item") {
      total += service.pricePerUnit * selection.quantity;
    }
  }

  return total;
}
