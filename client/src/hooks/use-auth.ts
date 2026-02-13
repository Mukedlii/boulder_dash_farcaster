import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

// Using Guest Auth for now as per schema
export function useAuth() {
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.guest.path, {
        method: api.auth.guest.method,
      });
      if (!res.ok) throw new Error("Failed to login");
      return await res.json();
    },
    onSuccess: (data) => {
      // Store user in local storage or just rely on session if cookies are used
      localStorage.setItem("user", JSON.stringify(data.user));
    },
  });

  return {
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    user: loginMutation.data?.user,
    error: loginMutation.error,
  };
}
