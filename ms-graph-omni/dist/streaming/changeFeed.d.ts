export interface NotificationRecord {
    id: string;
    receivedAt: string;
    subscriptionId: string;
    subscriptionExpirationDateTime?: string;
    changeType: string;
    clientState?: string;
    resource: string;
    resourceData?: Record<string, unknown>;
    encryptedContent?: Record<string, unknown>;
    tenantId?: string;
    /** Lifecycle event when this is a lifecycle notification, not a regular change. */
    lifecycleEvent?: "reauthorizationRequired" | "subscriptionRemoved" | "missed";
}
export declare function recordNotification(rec: NotificationRecord): void;
/** List subscription IDs that have at least one buffered notification. */
export declare function listFeedSubscriptions(): string[];
/** Read the last N notifications across all subscriptions, newest first. */
export declare function readRecent(limit?: number, subscriptionId?: string): NotificationRecord[];
export declare function clearFeed(subscriptionId: string): void;
