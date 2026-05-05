<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`. 

## Getting Started

Visit the [Quickstart Guide](https://docs.medusajs.com/learn/installation) to set up a server.

Visit the [Docs](https://docs.medusajs.com/learn/installation#get-started) to learn more about our system requirements.

## Development email testing

The backend registers a development-only Medusa notification provider for
MailDev. It is enabled by default when `NODE_ENV=development` and sends
email-channel notifications to the shared development MailDev instance:

- SMTP: `192.168.0.45:1025`
- Inbox UI: `http://192.168.0.45:1080`

Use these environment variables to override the defaults:

```bash
MAILDEV_ENABLED=true
MAILDEV_SMTP_HOST=192.168.0.45
MAILDEV_SMTP_PORT=1025
MAILDEV_SMTP_SECURE=false
MAILDEV_SMTP_REJECT_UNAUTHORIZED=false
MAILDEV_FROM=no-reply@3dbyte-tech.local
MAILDEV_WEB_URL=http://192.168.0.45:1080
# MAILDEV_SMTP_USER=
# MAILDEV_SMTP_PASS=
```

Set `MAILDEV_ENABLED=false` to disable the provider locally. Outside
development, the provider remains disabled unless `MAILDEV_ENABLED=true` is set
explicitly.

### Order confirmation email flow

The backend sends order confirmation email through Medusa's Notification Module.
The flow is provider-neutral:

1. `order.placed` event fires after checkout completion.
2. `src/subscribers/orders/order-placed.ts` queries order and store data.
3. `src/emails/renderers/order-placed.tsx` renders React Email HTML plus plain text.
4. `notification.createNotifications` sends the email through the active provider.

Development uses the MailDev provider. Production can switch to a Resend
provider without changing the subscriber or React Email templates because the
provider receives the same `content.subject`, `content.html`, and `content.text`
payload.

## What is Medusa

Medusa is a set of commerce modules and tools that allow you to build rich, reliable, and performant commerce applications without reinventing core commerce logic. The modules can be customized and used to build advanced ecommerce stores, marketplaces, or any product that needs foundational commerce primitives. All modules are open-source and freely available on npm.

Learn more about [Medusa’s architecture](https://docs.medusajs.com/learn/introduction/architecture) and [commerce modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules) in the Docs.

## Community & Contributions

The community and core team are available in [GitHub Discussions](https://github.com/medusajs/medusa/discussions), where you can ask for support, discuss roadmap, and share ideas.

Join our [Discord server](https://discord.com/invite/medusajs) to meet other community members.

## Other channels

- [GitHub Issues](https://github.com/medusajs/medusa/issues)
- [Twitter](https://twitter.com/medusajs)
- [LinkedIn](https://www.linkedin.com/company/medusajs)
- [Medusa Blog](https://medusajs.com/blog/)
