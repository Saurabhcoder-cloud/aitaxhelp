import { appConfig } from "../config";
import * as authStoreStub from "./auth";
import * as uploadStoreStub from "./uploads";
import * as entitlementStoreStub from "./entitlements";
import { dbAuthStore } from "./auth.db";
import { dbUploadStore } from "./uploads.db";
import { dbEntitlementStore } from "./entitlements.db";
import { dbJobStore } from "./jobs.db";

export const authStore: any = appConfig.stubMode ? authStoreStub : dbAuthStore;
export const uploadStore: any = appConfig.stubMode ? uploadStoreStub : dbUploadStore;
export const entitlementStore: any = appConfig.stubMode ? entitlementStoreStub : dbEntitlementStore;
export const jobStore: any = appConfig.stubMode ? null : dbJobStore;
