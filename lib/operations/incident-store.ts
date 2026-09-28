import {
  IncidentRecord,
  IncidentEventRecord,
  IncidentSeverity,
  IncidentStatus,
  ServiceId,
} from "@/types/operations";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { Metrics } from "@/lib/observability/metrics";
import { Logger } from "@/lib/observability/logger";
import { OperationalError } from "@/lib/observability/errors";

declare global {
  // eslint-disable-next-line no-var
  var __operationsIncidentsStore: Map<string, IncidentRecord> | undefined;
  // eslint-disable-next-line no-var
  var __incidentSequenceCounter: number | undefined;
}

function getIncidentsMap(): Map<string, IncidentRecord> {
  if (!globalThis.__operationsIncidentsStore) {
    globalThis.__operationsIncidentsStore = new Map<string, IncidentRecord>();
  }
  return globalThis.__operationsIncidentsStore;
}

function getNextIncidentNumber(): string {
  if (globalThis.__incidentSequenceCounter === undefined) {
    globalThis.__incidentSequenceCounter = 100;
  }
  globalThis.__incidentSequenceCounter += 1;
  const year = new Date().getFullYear();
  const padded = String(globalThis.__incidentSequenceCounter).padStart(6, "0");
  return `INC-${year}-${padded}`;
}

export interface CreateIncidentParams {
  title: string;
  severity: IncidentSeverity;
  service?: ServiceId;
  serviceId?: ServiceId;
  summary: string;
  createdBy: string;
  assignedTo?: string;
  customerImpact?: string;
  internalNotes?: string;
}

export interface UpdateIncidentParams {
  title?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  service?: ServiceId;
  serviceId?: ServiceId;
  summary?: string;
  assignedTo?: string;
  rootCause?: string;
  resolutionSummary?: string;
  customerImpact?: string;
  internalNotes?: string;
  actor: string;
}

export class IncidentStore {
  /**
   * Generates a unique, server-authoritative incident number (INC-YYYY-NNNNNN).
   */
  public static generateIncidentNumber(): string {
    return getNextIncidentNumber();
  }

  /**
   * Creates a new incident record and its initial detection event.
   */
  public static async createIncident(params: CreateIncidentParams): Promise<IncidentRecord> {
    const map = getIncidentsMap();
    const id = "inc_" + Math.random().toString(36).substring(2, 10);
    const incidentNumber = this.generateIncidentNumber();
    const now = new Date().toISOString();
    const service = params.service || params.serviceId || "APPLICATION";

    const initialEvent: IncidentEventRecord = {
      id: "ev_" + Math.random().toString(36).substring(2, 9),
      incidentId: id,
      timestamp: now,
      actor: params.createdBy,
      eventType: "detected",
      note: "Incident detected and registered in operational tracking.",
    };

    const incident: IncidentRecord = {
      id,
      incidentNumber,
      title: params.title,
      severity: params.severity,
      status: "DETECTED",
      service,
      serviceId: service,
      summary: params.summary,
      detectedAt: now,
      createdBy: params.createdBy,
      assignedTo: params.assignedTo,
      customerImpact: params.customerImpact,
      internalNotes: params.internalNotes,
      events: [initialEvent],
      createdAt: now,
      updatedAt: now,
    };

    map.set(id, incident);

    Metrics.increment("incident_created_total", 1, {
      severity: params.severity,
      service: params.service || params.serviceId || "UNKNOWN",
    });
    Logger.warn("incident:created", {
      incidentNumber,
      severity: params.severity,
      service: params.service,
      createdBy: params.createdBy,
    });

    AuditLogStore.append({
      userId: params.createdBy,
      action: "incident_created",
      resourceType: "incident",
      resourceId: incidentNumber,
      metadata: { severity: params.severity, service: params.service, title: params.title },
    });

    return incident;
  }

  /**
   * Retrieves an incident by its UUID or human-readable incidentNumber.
   */
  public static async getIncident(idOrNumber: string): Promise<IncidentRecord | null> {
    const map = getIncidentsMap();
    for (const inc of map.values()) {
      if (inc.id === idOrNumber || inc.incidentNumber === idOrNumber) {
        return inc;
      }
    }
    return null;
  }

  /**
   * Returns all incidents, sorted descending by detection timestamp.
   */
  public static async getAllIncidents(statusFilter?: IncidentStatus): Promise<IncidentRecord[]> {
    const map = getIncidentsMap();
    let list = Array.from(map.values());
    if (statusFilter) {
      list = list.filter((i) => i.status === statusFilter);
    }
    return list.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }

  /**
   * Updates an incident record and logs timeline events.
   */
  public static async updateIncident(
    idOrNumber: string,
    params: UpdateIncidentParams
  ): Promise<IncidentRecord> {
    const incident = await this.getIncident(idOrNumber);
    if (!incident) {
      throw new OperationalError("Incident not found.", 404, "INCIDENT_NOT_FOUND");
    }

    const now = new Date().toISOString();
    const prevStatus = incident.status;

    if (params.title) incident.title = params.title;
    if (params.severity) incident.severity = params.severity;
    if (params.service) incident.service = params.service;
    if (params.summary) incident.summary = params.summary;
    if (params.assignedTo !== undefined) incident.assignedTo = params.assignedTo;
    if (params.rootCause !== undefined) incident.rootCause = params.rootCause;
    if (params.resolutionSummary !== undefined) incident.resolutionSummary = params.resolutionSummary;
    if (params.customerImpact !== undefined) incident.customerImpact = params.customerImpact;
    if (params.internalNotes !== undefined) incident.internalNotes = params.internalNotes;

    // Handle lifecycle status changes
    if (params.status && params.status !== prevStatus) {
      incident.status = params.status;

      if (params.status === "IDENTIFIED" && !incident.identifiedAt) {
        incident.identifiedAt = now;
      } else if (params.status === "MITIGATING" && !incident.mitigatedAt) {
        incident.mitigatedAt = now;
      } else if (params.status === "RESOLVED") {
        incident.resolvedAt = now;
      } else if (params.status === "CLOSED") {
        incident.closedAt = now;
      }

      this.addEvent(incident.id, params.actor, params.status.toLowerCase(), `Status transitioned from ${prevStatus} to ${params.status}.`);

      AuditLogStore.append({
        userId: params.actor,
        action: `incident_status_${params.status.toLowerCase()}`,
        resourceType: "incident",
        resourceId: incident.incidentNumber,
        metadata: { prevStatus, newStatus: params.status },
      });
    }

    incident.updatedAt = now;
    getIncidentsMap().set(incident.id, incident);

    return incident;
  }

  /**
   * Appends an event to the incident timeline.
   */
  public static addEvent(
    incidentId: string,
    actor: string,
    eventType: string,
    note: string
  ): IncidentEventRecord {
    const incident = getIncidentsMap().get(incidentId);
    if (!incident) {
      throw new OperationalError("Incident not found.", 404, "INCIDENT_NOT_FOUND");
    }

    const event: IncidentEventRecord = {
      id: "ev_" + Math.random().toString(36).substring(2, 9),
      incidentId,
      timestamp: new Date().toISOString(),
      actor,
      eventType,
      note,
    };

    if (!incident.events) {
      incident.events = [];
    }
    incident.events.push(event);
    incident.updatedAt = event.timestamp;

    return event;
  }

  /**
   * Resets incident store (used in tests).
   */
  public static clear(): void {
    getIncidentsMap().clear();
    globalThis.__incidentSequenceCounter = 100;
  }
}
