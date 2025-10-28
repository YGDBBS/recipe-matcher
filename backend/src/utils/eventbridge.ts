// src/utils/eventbridge.ts
import {
    EventBridgeClient,
    PutEventsCommand,
    PutEventsCommandInput,
  } from '@aws-sdk/client-eventbridge';
  
  const eb = new EventBridgeClient({});
  
  /**
   * Required fields for a valid EventBridge event entry
   */
  interface EventBridgeEntry {
    Source: string;
    DetailType: string;
    Detail: string;
    EventBusName?: string; // optional if using default bus
  }
  
  export const publishEvent = async (entry: EventBridgeEntry): Promise<void> => {
    // Validate required fields at runtime (TypeScript can't catch this at compile)
    if (!entry.Source || !entry.DetailType || !entry.Detail) {
      console.error('Invalid EventBridge entry: missing Source, DetailType, or Detail', entry);
      return;
    }
  
    const commandInput: PutEventsCommandInput = {
      Entries: [
        {
          Source: entry.Source,
          DetailType: entry.DetailType,
          Detail: entry.Detail,
          EventBusName: entry.EventBusName,
        },
      ],
    };
  
    try {
      const command = new PutEventsCommand(commandInput);
      const response = await eb.send(command);
  
      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        console.warn('EventBridge publish failed (non-blocking)', response.Entries);
      }
    } catch (error) {
      console.error('EventBridge publish error (non-blocking):', error);
    }
  };