import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ClothingItem } from "../types/database";

export function useClothingItems() {
  return useQuery({
    queryKey: ["clothing_items"],
    queryFn: async () => {
      const { data } = await api.clothing.list();
      return (data as ClothingItem[]) || [];
    },
    staleTime: 1000 * 60 * 3,
  });
}

export function useClothingItem(id: string | undefined) {
  return useQuery({
    queryKey: ["clothing_item", id],
    queryFn: async () => {
      const { data } = await api.clothing.get(id!);
      return data as ClothingItem;
    },
    enabled: !!id,
  });
}

export function useDeleteClothingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; imageUrl?: string; userId?: string }) => {
      return api.clothing.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clothing_items"] });
    },
  });
}
