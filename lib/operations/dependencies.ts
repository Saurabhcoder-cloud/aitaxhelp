import { ServiceId } from "@/types/operations";
import { SERVICE_CATALOG } from "./service-catalog";

/**
 * Service Dependency Graph (Phase 5 Step 19)
 *
 * Models upstream and downstream relationships between platform components.
 * Invariant: Graph must be a Directed Acyclic Graph (DAG) with zero circular dependencies.
 */
export class ServiceDependencyGraph {
  /**
   * Returns immediate upstream dependencies required by the service.
   */
  public static getDependencies(serviceId: ServiceId): ServiceId[] {
    const item = SERVICE_CATALOG[serviceId];
    return item ? [...item.dependencies] : [];
  }

  /**
   * Returns downstream services that depend on the given service.
   */
  public static getDependents(serviceId: ServiceId): ServiceId[] {
    const dependents: ServiceId[] = [];
    for (const [id, item] of Object.entries(SERVICE_CATALOG)) {
      if (item.dependencies.includes(serviceId)) {
        dependents.push(id as ServiceId);
      }
    }
    return dependents;
  }

  /**
   * Performs cycle detection to verify the graph is strictly acyclic.
   */
  public static validateAcyclic(): boolean {
    const visited = new Set<ServiceId>();
    const recursionStack = new Set<ServiceId>();

    const checkCycle = (node: ServiceId): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = this.getDependencies(node);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (checkCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const serviceId of Object.keys(SERVICE_CATALOG) as ServiceId[]) {
      if (!visited.has(serviceId)) {
        if (checkCycle(serviceId)) {
          return false;
        }
      }
    }

    return true;
  }
}
