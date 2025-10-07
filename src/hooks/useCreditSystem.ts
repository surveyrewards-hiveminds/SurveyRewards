import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface CreditPackage {
  id: string;
  credit_amount: number;
  price_jpy: number;
  discount_percentage: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCredits {
  id: string;
  user_id: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  credit_package_id: string;
  transaction_type: "purchase" | "usage" | "reward" | "refund";
  credit_amount: number;
  price_jpy: number | null;
  stripe_payment_intent_id: string | null;
  status: "pending" | "completed" | "failed" | "refunded";
  description: string | null;
  invoice_number: string | null;
  invoice_pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UseCreditSystemReturn {
  // Credit packages
  packages: CreditPackage[];
  packagesLoading: boolean;

  // User credits
  userCredits: number;
  creditsLoading: boolean;

  // Recent transactions
  recentTransactions: CreditTransaction[];
  transactionsLoading: boolean;

  // Actions
  purchaseCredits: (packageId: string) => Promise<{
    url: string;
    sessionId: string;
  } | null>;
  purchaseCustomCredits: (creditAmount: number) => Promise<{
    url: string;
    sessionId: string;
  } | null>;
  refreshUserCredits: () => Promise<void>;
  refreshTransactions: () => Promise<void>;

  // Pagination support
  paginatedTransactions?: CreditTransaction[];
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  loadTransactionsPage?: (page?: number, pageSize?: number) => Promise<void>;
  loadNextPage?: () => Promise<void>;
  loadPrevPage?: () => Promise<void>;
  totalTransactions?: number | null;

  // State
  loading: boolean;
  error: string | null;
}

export function useCreditSystem(): UseCreditSystemReturn {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const [userCredits, setUserCredits] = useState<number>(0);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const [recentTransactions, setRecentTransactions] = useState<
    CreditTransaction[]
  >([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Pagination state
  const [paginatedTransactions, setPaginatedTransactions] = useState<
    CreditTransaction[]
  >([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalTransactions, setTotalTransactions] = useState<number | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch credit packages
  const fetchPackages = async () => {
    setPackagesLoading(true);
    try {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("credit_amount", { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error("Error fetching credit packages:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch credit packages"
      );
    } finally {
      setPackagesLoading(false);
    }
  };

  // Fetch user credits
  const refreshUserCredits = useCallback(async () => {
    setCreditsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_credit_balance")
        .select("credits")
        .eq("user_id", user.id)
        .maybeSingle(); // Use maybeSingle() to handle users without records

      if (error) throw error;
      setUserCredits(data?.credits || 0);
    } catch (err) {
      console.error("Error fetching user credits:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch user credits"
      );
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  // Fetch recent transactions
  const refreshTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch transactions"
      );
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // Load a specific page of transactions (offset-based pagination)
  const loadTransactionsPage = useCallback(
    async (pageNumber = 1, size = pageSize) => {
      setTransactionsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const from = (pageNumber - 1) * size;
        const to = from + size - 1;

        const { data, error, count } = await supabase
          .from("credit_transactions")
          .select("*", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        setPaginatedTransactions(data || []);
        setPage(pageNumber);
        setPageSize(size);
        setTotalTransactions(count ?? null);
        setHasMore((pageNumber * size) < (count ?? 0));
      } catch (err) {
        console.error("Error fetching paginated transactions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch transactions"
        );
      } finally {
        setTransactionsLoading(false);
      }
    },
    [pageSize]
  );

  const loadNextPage = useCallback(async () => {
    await loadTransactionsPage(page + 1, pageSize);
  }, [loadTransactionsPage, page, pageSize]);

  const loadPrevPage = useCallback(async () => {
    if (page <= 1) return;
    await loadTransactionsPage(page - 1, pageSize);
  }, [loadTransactionsPage, page, pageSize]);

  // Purchase credits
  const purchaseCredits = async (packageId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-credit-checkout",
        {
          body: { creditPackageId: packageId },
        }
      );

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to create checkout session";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Purchase custom amount of credits
  const purchaseCustomCredits = async (creditAmount: number) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-custom-credit-checkout",
        {
          body: { creditAmount },
        }
      );

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to create custom credit checkout session";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchPackages();
    refreshUserCredits();
    // load both recent and paginated first page
    refreshTransactions();
    loadTransactionsPage(1, 10);
  }, []);

  // Set up real-time subscription for user credits
  useEffect(() => {
    let subscription: any = null;

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Create a unique channel name to avoid conflicts
      const channelName = `user-credits-${user.id}-${Date.now()}`;

      subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "credit_transactions",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            refreshUserCredits();
            refreshTransactions();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // Keep empty dependency array

  return {
    packages,
    packagesLoading,
    userCredits,
    creditsLoading,
    recentTransactions,
    transactionsLoading,
    purchaseCredits,
    purchaseCustomCredits,
    refreshUserCredits,
    refreshTransactions,
    // pagination API
    paginatedTransactions,
    page,
    pageSize,
    hasMore,
    totalTransactions,
    loadTransactionsPage,
    loadNextPage,
    loadPrevPage,
    loading,
    error,
  };
}
