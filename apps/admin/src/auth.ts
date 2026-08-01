import { useApiClient } from "@repo/api-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Credentials {
  email: string;
  password: string;
}

/** The current user (the session). A 401 becomes isError (retry:false), used as the auth gate. */
export function useMe() {
  const client = useApiClient();
  return useQuery({
    queryKey: ["me"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/auth/me");
      if (error) {
        throw error;
      }
      return data;
    },
  });
}

export function useLogin() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (creds: Credentials) => {
      const { data, error } = await client.POST("/api/v1/auth/login", { body: creds });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await client.POST("/api/v1/auth/logout");
    },
    onSuccess: () => queryClient.clear(),
  });
}
