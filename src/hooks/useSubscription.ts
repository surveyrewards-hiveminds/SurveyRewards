import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}

interface UserSubscription {
  id: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface UseSubscriptionReturn {
  plans: SubscriptionPlan[];
  currentSubscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  subscribe: (planId: string) => Promise<{ url: string } | null>;
  cancelSubscription: () => Promise<boolean>;
  updateSubscription: (newPlanId: string) => Promise<boolean>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available plans
  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('price');

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const subscribe = async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create checkout session';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;

      await fetchCurrentSubscription();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (newPlanId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.functions.invoke('update-subscription', {
        body: { planId: newPlanId }
      });

      if (error) throw error;
      await fetchCurrentSubscription();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subscription';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    plans,
    currentSubscription,
    loading,
    error,
    subscribe,
    cancelSubscription,
    updateSubscription
  };
}
