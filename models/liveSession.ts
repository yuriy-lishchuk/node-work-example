export class LiveSession {
    eventId:number;
    liveSessionId: number;
    name: string;
    description: string;
    zoomUrl: string;
    sessionLinkType: 'link' | 'description';
    sessionDate: string;
    sessionStartTime: string;
    sessionEndTime: string;
    sessionStart: Date; // used for CRUD
    sessionEnd: Date; // used for CRUD
    timezone: string;
    liveSessionOrder: number;

    constructor(name: string, description: string, zoomUrl: string, sessionLinkType: 'link' | 'description', 
            sessionStart: Date, sessionEnd: Date, liveSessionOrder: number) {
        this.name = name;
        this.description = description;
        this.zoomUrl = zoomUrl;
        this.sessionLinkType = sessionLinkType;
        this.sessionStart = sessionStart;
        this.sessionEnd = sessionEnd;
        this.liveSessionOrder = liveSessionOrder;
    }
}
