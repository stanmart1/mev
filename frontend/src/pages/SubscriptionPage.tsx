import { SubscriptionManager } from '@/components/subscription/SubscriptionManager'

export function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and API keys
        </p>
      </div>
      <SubscriptionManager />
    </div>
  )
}