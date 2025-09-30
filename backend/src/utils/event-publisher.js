"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisher = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
class EventPublisher {
    constructor(eventBusName) {
        this.eventBridge = new client_eventbridge_1.EventBridgeClient({});
        this.eventBusName = eventBusName;
    }
    async publishEvent(event) {
        const eventEntry = {
            Source: event.source,
            DetailType: event['detail-type'],
            Detail: JSON.stringify(event.detail),
            EventBusName: this.eventBusName,
        };
        try {
            const command = new client_eventbridge_1.PutEventsCommand({
                Entries: [eventEntry],
            });
            const result = await this.eventBridge.send(command);
            if (result.FailedEntryCount && result.FailedEntryCount > 0) {
                console.error('Failed to publish event:', result.Entries);
                throw new Error('Failed to publish event to EventBridge');
            }
            console.log('Event published successfully:', {
                source: event.source,
                detailType: event['detail-type'],
                eventId: result.Entries?.[0]?.EventId,
            });
        }
        catch (error) {
            console.error('Error publishing event:', error);
            throw error;
        }
    }
    // Helper methods for common events
    async publishUserRegistered(detail) {
        return this.publishEvent({
            source: 'recipe-matcher.user',
            'detail-type': 'UserRegistered',
            detail,
        });
    }
    async publishUserIngredientsUpdated(detail) {
        return this.publishEvent({
            source: 'recipe-matcher.user',
            'detail-type': 'UserIngredientsUpdated',
            detail,
        });
    }
    async publishRecipeCreated(detail) {
        return this.publishEvent({
            source: 'recipe-matcher.recipe',
            'detail-type': 'RecipeCreated',
            detail,
        });
    }
    async publishRecipeMatched(detail) {
        return this.publishEvent({
            source: 'recipe-matcher.matching',
            'detail-type': 'RecipeMatched',
            detail,
        });
    }
    async publishRecipeRated(detail) {
        return this.publishEvent({
            source: 'recipe-matcher.recipe',
            'detail-type': 'RecipeRated',
            detail,
        });
    }
    async publishRecipeShared(detail) {
        return this.publishEvent({
            source: 'recipe-matcher.recipe',
            'detail-type': 'RecipeShared',
            detail,
        });
    }
}
exports.EventPublisher = EventPublisher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtcHVibGlzaGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnQtcHVibGlzaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9FQUFrRjtBQUdsRixNQUFhLGNBQWM7SUFJekIsWUFBWSxZQUFvQjtRQUM5QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksc0NBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQ2hCLEtBQThFO1FBRTlFLE1BQU0sVUFBVSxHQUFHO1lBQ2pCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixVQUFVLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQztZQUNoQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQ3BDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUNoQyxDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSxxQ0FBZ0IsQ0FBQztnQkFDbkMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDO2FBQ3RCLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFcEQsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLElBQUksTUFBTSxDQUFDLGdCQUFnQixHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMzRCxPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO1lBQzVELENBQUM7WUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixFQUFFO2dCQUMzQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07Z0JBQ3BCLFVBQVUsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDO2dCQUNoQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU87YUFDdEMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hELE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRCxtQ0FBbUM7SUFDbkMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE1BQTZHO1FBQ3ZJLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN2QixNQUFNLEVBQUUscUJBQXFCO1lBQzdCLGFBQWEsRUFBRSxnQkFBZ0I7WUFDL0IsTUFBTTtTQUNQLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsNkJBQTZCLENBQUMsTUFBOEY7UUFDaEksT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3ZCLE1BQU0sRUFBRSxxQkFBcUI7WUFDN0IsYUFBYSxFQUFFLHdCQUF3QjtZQUN2QyxNQUFNO1NBQ1AsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUEwTjtRQUNuUCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsTUFBTSxFQUFFLHVCQUF1QjtZQUMvQixhQUFhLEVBQUUsZUFBZTtZQUM5QixNQUFNO1NBQ1AsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFxTDtRQUM5TSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsTUFBTSxFQUFFLHlCQUF5QjtZQUNqQyxhQUFhLEVBQUUsZUFBZTtZQUM5QixNQUFNO1NBQ1AsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUErSDtRQUN0SixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsTUFBTSxFQUFFLHVCQUF1QjtZQUMvQixhQUFhLEVBQUUsYUFBYTtZQUM1QixNQUFNO1NBQ1AsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxNQUFpSztRQUN6TCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsTUFBTSxFQUFFLHVCQUF1QjtZQUMvQixhQUFhLEVBQUUsY0FBYztZQUM3QixNQUFNO1NBQ1AsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBMUZELHdDQTBGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEV2ZW50QnJpZGdlQ2xpZW50LCBQdXRFdmVudHNDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWV2ZW50YnJpZGdlJztcbmltcG9ydCB7IFJlY2lwZU1hdGNoZXJFdmVudCB9IGZyb20gJy4uL3R5cGVzL2V2ZW50cyc7XG5cbmV4cG9ydCBjbGFzcyBFdmVudFB1Ymxpc2hlciB7XG4gIHByaXZhdGUgZXZlbnRCcmlkZ2U6IEV2ZW50QnJpZGdlQ2xpZW50O1xuICBwcml2YXRlIGV2ZW50QnVzTmFtZTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKGV2ZW50QnVzTmFtZTogc3RyaW5nKSB7XG4gICAgdGhpcy5ldmVudEJyaWRnZSA9IG5ldyBFdmVudEJyaWRnZUNsaWVudCh7fSk7XG4gICAgdGhpcy5ldmVudEJ1c05hbWUgPSBldmVudEJ1c05hbWU7XG4gIH1cblxuICBhc3luYyBwdWJsaXNoRXZlbnQ8VCBleHRlbmRzIFJlY2lwZU1hdGNoZXJFdmVudD4oXG4gICAgZXZlbnQ6IE9taXQ8VCwgJ3ZlcnNpb24nIHwgJ2lkJyB8ICdhY2NvdW50JyB8ICd0aW1lJyB8ICdyZWdpb24nIHwgJ3Jlc291cmNlcyc+XG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGV2ZW50RW50cnkgPSB7XG4gICAgICBTb3VyY2U6IGV2ZW50LnNvdXJjZSxcbiAgICAgIERldGFpbFR5cGU6IGV2ZW50WydkZXRhaWwtdHlwZSddLFxuICAgICAgRGV0YWlsOiBKU09OLnN0cmluZ2lmeShldmVudC5kZXRhaWwpLFxuICAgICAgRXZlbnRCdXNOYW1lOiB0aGlzLmV2ZW50QnVzTmFtZSxcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0RXZlbnRzQ29tbWFuZCh7XG4gICAgICAgIEVudHJpZXM6IFtldmVudEVudHJ5XSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV2ZW50QnJpZGdlLnNlbmQoY29tbWFuZCk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQuRmFpbGVkRW50cnlDb3VudCAmJiByZXN1bHQuRmFpbGVkRW50cnlDb3VudCA+IDApIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHB1Ymxpc2ggZXZlbnQ6JywgcmVzdWx0LkVudHJpZXMpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBwdWJsaXNoIGV2ZW50IHRvIEV2ZW50QnJpZGdlJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUubG9nKCdFdmVudCBwdWJsaXNoZWQgc3VjY2Vzc2Z1bGx5OicsIHtcbiAgICAgICAgc291cmNlOiBldmVudC5zb3VyY2UsXG4gICAgICAgIGRldGFpbFR5cGU6IGV2ZW50WydkZXRhaWwtdHlwZSddLFxuICAgICAgICBldmVudElkOiByZXN1bHQuRW50cmllcz8uWzBdPy5FdmVudElkLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHB1Ymxpc2hpbmcgZXZlbnQ6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgLy8gSGVscGVyIG1ldGhvZHMgZm9yIGNvbW1vbiBldmVudHNcbiAgYXN5bmMgcHVibGlzaFVzZXJSZWdpc3RlcmVkKGRldGFpbDogUmVjaXBlTWF0Y2hlckV2ZW50WydkZXRhaWwnXSAmIHsgdXNlcklkOiBzdHJpbmc7IGVtYWlsOiBzdHJpbmc7IHVzZXJuYW1lOiBzdHJpbmc7IHRpbWVzdGFtcDogc3RyaW5nIH0pIHtcbiAgICByZXR1cm4gdGhpcy5wdWJsaXNoRXZlbnQoe1xuICAgICAgc291cmNlOiAncmVjaXBlLW1hdGNoZXIudXNlcicsXG4gICAgICAnZGV0YWlsLXR5cGUnOiAnVXNlclJlZ2lzdGVyZWQnLFxuICAgICAgZGV0YWlsLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcHVibGlzaFVzZXJJbmdyZWRpZW50c1VwZGF0ZWQoZGV0YWlsOiBSZWNpcGVNYXRjaGVyRXZlbnRbJ2RldGFpbCddICYgeyB1c2VySWQ6IHN0cmluZzsgaW5ncmVkaWVudHM6IGFueTsgdGltZXN0YW1wOiBzdHJpbmcgfSkge1xuICAgIHJldHVybiB0aGlzLnB1Ymxpc2hFdmVudCh7XG4gICAgICBzb3VyY2U6ICdyZWNpcGUtbWF0Y2hlci51c2VyJyxcbiAgICAgICdkZXRhaWwtdHlwZSc6ICdVc2VySW5ncmVkaWVudHNVcGRhdGVkJyxcbiAgICAgIGRldGFpbCxcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHB1Ymxpc2hSZWNpcGVDcmVhdGVkKGRldGFpbDogUmVjaXBlTWF0Y2hlckV2ZW50WydkZXRhaWwnXSAmIHsgcmVjaXBlSWQ6IHN0cmluZzsgdXNlcklkOiBzdHJpbmc7IHRpdGxlOiBzdHJpbmc7IGluZ3JlZGllbnRzOiBzdHJpbmdbXTsgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXTsgY29va2luZ1RpbWU6IG51bWJlcjsgZGlmZmljdWx0eUxldmVsOiBzdHJpbmc7IHRhZ3M6IHN0cmluZ1tdOyB0aW1lc3RhbXA6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIHRoaXMucHVibGlzaEV2ZW50KHtcbiAgICAgIHNvdXJjZTogJ3JlY2lwZS1tYXRjaGVyLnJlY2lwZScsXG4gICAgICAnZGV0YWlsLXR5cGUnOiAnUmVjaXBlQ3JlYXRlZCcsXG4gICAgICBkZXRhaWwsXG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBwdWJsaXNoUmVjaXBlTWF0Y2hlZChkZXRhaWw6IFJlY2lwZU1hdGNoZXJFdmVudFsnZGV0YWlsJ10gJiB7IHVzZXJJZDogc3RyaW5nOyByZWNpcGVJZDogc3RyaW5nOyBtYXRjaFBlcmNlbnRhZ2U6IG51bWJlcjsgYXZhaWxhYmxlSW5ncmVkaWVudHM6IHN0cmluZ1tdOyBtaXNzaW5nSW5ncmVkaWVudHM6IHN0cmluZ1tdOyB0aW1lc3RhbXA6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIHRoaXMucHVibGlzaEV2ZW50KHtcbiAgICAgIHNvdXJjZTogJ3JlY2lwZS1tYXRjaGVyLm1hdGNoaW5nJyxcbiAgICAgICdkZXRhaWwtdHlwZSc6ICdSZWNpcGVNYXRjaGVkJyxcbiAgICAgIGRldGFpbCxcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHB1Ymxpc2hSZWNpcGVSYXRlZChkZXRhaWw6IFJlY2lwZU1hdGNoZXJFdmVudFsnZGV0YWlsJ10gJiB7IHJlY2lwZUlkOiBzdHJpbmc7IHVzZXJJZDogc3RyaW5nOyByYXRpbmc6IG51bWJlcjsgcmV2aWV3Pzogc3RyaW5nOyB0aW1lc3RhbXA6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIHRoaXMucHVibGlzaEV2ZW50KHtcbiAgICAgIHNvdXJjZTogJ3JlY2lwZS1tYXRjaGVyLnJlY2lwZScsXG4gICAgICAnZGV0YWlsLXR5cGUnOiAnUmVjaXBlUmF0ZWQnLFxuICAgICAgZGV0YWlsLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcHVibGlzaFJlY2lwZVNoYXJlZChkZXRhaWw6IFJlY2lwZU1hdGNoZXJFdmVudFsnZGV0YWlsJ10gJiB7IHJlY2lwZUlkOiBzdHJpbmc7IGZyb21Vc2VySWQ6IHN0cmluZzsgdG9Vc2VySWQ/OiBzdHJpbmc7IHNoYXJlVHlwZTogJ3B1YmxpYycgfCAncHJpdmF0ZScgfCAnZmFtaWx5JzsgdGltZXN0YW1wOiBzdHJpbmcgfSkge1xuICAgIHJldHVybiB0aGlzLnB1Ymxpc2hFdmVudCh7XG4gICAgICBzb3VyY2U6ICdyZWNpcGUtbWF0Y2hlci5yZWNpcGUnLFxuICAgICAgJ2RldGFpbC10eXBlJzogJ1JlY2lwZVNoYXJlZCcsXG4gICAgICBkZXRhaWwsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==