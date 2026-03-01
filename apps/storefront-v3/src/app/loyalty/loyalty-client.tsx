"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Star, 
  Gift, 
  TrendingUp, 
  Trophy,
  Crown,
  Gem,
  ArrowRight,
  History,
  Award
} from "lucide-react"
import type { LoyaltyPoints, PointsTransaction, RewardTier } from "@/app/actions/loyalty"

interface LoyaltyClientProps {
  loyalty: LoyaltyPoints
  transactions: PointsTransaction[]
  tiers: RewardTier[]
}

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Gem className="w-5 h-5" />,
  Silver: <Star className="w-5 h-5" />,
  Gold: <Crown className="w-5 h-5" />,
  Platinum: <Trophy className="w-5 h-5" />,
}

const tierColors: Record<string, string> = {
  Bronze: "bg-amber-700 text-white",
  Silver: "bg-slate-400 text-white",
  Gold: "bg-yellow-500 text-white",
  Platinum: "bg-gradient-to-r from-purple-600 to-purple-800 text-white",
}

export function LoyaltyClient({ loyalty, transactions, tiers }: LoyaltyClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "rewards">("overview")

  const currentTier = tiers.find(t => t.name === loyalty.tier) || tiers[0]
  const nextTier = tiers[tiers.indexOf(currentTier) + 1]
  const progressPercent = nextTier 
    ? Math.min(100, ((loyalty.points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100)
    : 100

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Loyalty Rewards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Earn points with every purchase and unlock exclusive rewards
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Overview
          </Button>
          <Button 
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>
          <Button 
            variant={activeTab === "rewards" ? "default" : "outline"}
            onClick={() => setActiveTab("rewards")}
            className="gap-2"
          >
            <Gift className="w-4 h-4" />
            Rewards
          </Button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Points Balance Card */}
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full ${tierColors[loyalty.tier]}`}>
                    {tierIcons[loyalty.tier]}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Points</p>
                    <p className="text-4xl font-bold">{loyalty.points.toLocaleString()}</p>
                    <Badge variant="secondary" className="mt-1">
                      {loyalty.tier} Member
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Lifetime Points</p>
                    <p className="text-lg font-semibold">{loyalty.lifetimePoints.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Discount</p>
                    <p className="text-lg font-semibold text-green-600">{currentTier.discount} OFF</p>
                  </div>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {nextTier && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress to {nextTier.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {nextTier.minPoints - loyalty.points} points to go
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{loyalty.tier} ({currentTier.minPoints} pts)</span>
                    <span>{nextTier.name} ({nextTier.minPoints} pts)</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Points Earned (This Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">+{transactions.filter(t => t.type === "earned").reduce((sum, t) => sum + t.points, 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Points Redeemed (This Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">-{transactions.filter(t => t.type === "redeemed").reduce((sum, t) => sum + t.points, 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Upcoming Reward
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{nextTier ? nextTier.discount : "Max"} OFF</p>
                <p className="text-xs text-muted-foreground">{nextTier ? `At ${nextTier.minPoints} points` : "Maximum tier reached"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Current Tier Perks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {tierIcons[loyalty.tier]}
                Your {loyalty.tier} Perks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentTier.perks.map((perk, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✓
                    </Badge>
                    {perk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Points History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No transactions yet. Start earning points!
              </p>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        transaction.type === "earned" 
                          ? "bg-green-100 text-green-600" 
                          : "bg-orange-100 text-orange-600"
                      }`}>
                        {transaction.type === "earned" ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <Gift className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)}
                          {transaction.orderId && ` • Order ${transaction.orderId}`}
                        </p>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      transaction.type === "earned" ? "text-green-600" : "text-orange-600"
                    }`}>
                      {transaction.type === "earned" ? "+" : "-"}{transaction.points} pts
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rewards Tab */}
      {activeTab === "rewards" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Rewards Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tiers.map((tier) => {
                  const isCurrentTier = tier.name === loyalty.tier
                  const isUnlocked = tiers.indexOf(tier) <= tiers.indexOf(currentTier)
                  
                  return (
                    <div 
                      key={tier.id}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        isCurrentTier 
                          ? "border-primary bg-primary/5 shadow-lg scale-105" 
                          : isUnlocked 
                            ? "border-muted bg-muted/30" 
                            : "border-dashed opacity-60"
                      }`}
                    >
                      {isCurrentTier && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                          Current
                        </Badge>
                      )}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                        tierColors[tier.name]
                      }`}>
                        {tierIcons[tier.name]}
                      </div>
                      <h3 className="text-lg font-semibold text-center">{tier.name}</h3>
                      <p className="text-center text-sm text-muted-foreground mb-3">
                        {tier.minPoints.toLocaleString()}+ points
                      </p>
                      <p className="text-center font-bold text-green-600 mb-3">
                        {tier.discount} OFF
                      </p>
                      <ul className="space-y-1">
                        {tier.perks.map((perk, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="text-green-500">•</span>
                            {perk}
                          </li>
                        ))}
                      </ul>
                      {!isUnlocked && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground text-center">
                            {(tier.minPoints - loyalty.points).toLocaleString()} points needed
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { points: 50, reward: "$5 Off Next Order", discount: "$5" },
                  { points: 100, reward: "$10 Off Next Order", discount: "$10" },
                  { points: 200, reward: "$25 Off Next Order", discount: "$25" },
                  { points: 300, reward: "Free Shipping", discount: "Free Ship" },
                  { points: 500, reward: "$50 Off Next Order", discount: "$50" },
                  { points: 1000, reward: "$100 Off Next Order", discount: "$100" },
                ].map((reward, index) => {
                  const canRedeem = loyalty.points >= reward.points
                  return (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border ${
                        canRedeem 
                          ? "border-green-200 bg-green-50/50" 
                          : "border-muted opacity-60"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{reward.reward}</p>
                          <p className="text-sm text-muted-foreground">{reward.points} points</p>
                        </div>
                        <Badge variant={canRedeem ? "default" : "secondary"}>
                          {canRedeem ? "Available" : "Locked"}
                        </Badge>
                      </div>
                      <Button 
                        className="w-full mt-2" 
                        variant={canRedeem ? "default" : "outline"}
                        disabled={!canRedeem}
                      >
                        Redeem
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
