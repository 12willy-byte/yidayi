import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Outfit } from "../types/database";

export function useOutfitFeed() {
  return useQuery({
    queryKey: ["outfits_feed"],
    queryFn: async () => {
      const { data } = await api.outfits.list();
      return (data as Outfit[]) || [];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useOutfitDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["outfit", id],
    queryFn: async () => {
      const { data } = await api.outfits.get(id!);
      return data as Outfit;
    },
    enabled: !!id,
  });
}

export function useLikeOutfit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outfitId: string) => {
      return api.outfits.like(outfitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits_feed"] });
      queryClient.invalidateQueries({ queryKey: ["outfit"] });
    },
  });
}
