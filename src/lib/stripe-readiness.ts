import type Stripe from "stripe";

export interface StripeAccountReadiness {
  accountMatches: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsClear: boolean;
  ready: boolean;
}

export function evaluateStripeAccountReadiness(
  account: Pick<
    Stripe.Account,
    "id" | "charges_enabled" | "payouts_enabled" | "requirements"
  >,
  expectedAccountId: string
): StripeAccountReadiness {
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const disabledReason = account.requirements?.disabled_reason ?? null;

  const result = {
    accountMatches: account.id === expectedAccountId,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    requirementsClear:
      disabledReason === null &&
      currentlyDue.length === 0 &&
      pastDue.length === 0,
  };

  return {
    ...result,
    ready:
      result.accountMatches &&
      result.chargesEnabled &&
      result.payoutsEnabled &&
      result.requirementsClear,
  };
}
