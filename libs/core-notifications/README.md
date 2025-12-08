# @data-scout/core-notifications

Notification abstraction layer for the Data Scout platform.

## Overview

This library provides a pluggable notification architecture that allows scrapers to send alerts through various channels. The factory pattern enables easy configuration of different notification methods.

## Key Components

- **INotificationAdapter**: Interface for notification adapters
- **NotificationFactory**: Factory for creating notification adapters
- **NotificationConfig**: Configuration interface
- **NotificationMessage**: Message structure

## Supported Channels (Planned)

- Email
- Slack
- Webhooks
- Console logging

## Usage

```typescript
import { NotificationFactory } from '@data-scout/core-notifications';

const notifier = NotificationFactory.create({
  type: 'slack',
  webhookUrl: 'https://hooks.slack.com/...'
});

await notifier.send({
  title: 'Scraper completed',
  body: 'Successfully scraped 100 items',
  severity: 'info'
});
```

## Status

🚧 **Work in Progress** - This is a placeholder library. Implementation coming soon.
