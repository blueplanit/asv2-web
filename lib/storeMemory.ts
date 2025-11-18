export type ConnectRecord = {
    userId: string;
    accountId: string;
    livemode: boolean;
    connectedAt: Date;
};

export interface ConnectKitStore {
    saveConnection(rec: ConnectRecord): Promise<void>;
    removeConnection(accountId: string): Promise<void>;
    findByUserId(userId: string): Promise<ConnectRecord | null>;
    markEventProcessed(eventId: string): Promise<boolean>;
}

// In-memory demo store
// Replace with real DB when we decide
class MemoryStore implements ConnectKitStore {
    private conns = new Map<string, ConnectRecord>();
    private events = new Set<string>();

    async saveConnection(rec: ConnectRecord) {
        this.conns.set(rec.userId, rec);
    }

    async removeConnection(accountId: string) {
        this.conns.delete(accountId);
    }

    async findByUserId(userId: string) {
        // when using sql
        // return db.query('SELECT * FROM connections WHERE userId = ?', [userId]);
        return this.conns.get(userId) ?? null;
    }

    async markEventProcessed(eventId: string) {
        if (this.events.has(eventId)) return false;
        this.events.add(eventId);
        return true;
    }
}

export const store = new MemoryStore();
