import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAvailableCountries() {
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchCountries = async () => {
      const { data, error } = await supabase.rpc(
        "get_available_countries_for_user"
      );
      if (error) {
        setError(error.message);
        setCountries([]);
      } else {
        const uniqueCountries = Array.from(
          new Set(
            (data || []).map(
              (row: { country_code: string }) => row.country_code
            )
          )
        ).sort();
        setCountries(uniqueCountries as string[]);
      }
      setLoading(false);
    };

    fetchCountries();
  }, []);

  return { countries, loading, error };
}
