import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, User } from '@margi-ai/shared';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryKeys';

interface AuthMeResponse {
  user: User;
}

export function useMe() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async (): Promise<User | null> => {
      try {
        const res = await apiClient<AuthMeResponse>('/auth/me');
        return res.user;
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const res = await apiClient<AuthMeResponse>('/auth/login', {
        method: 'POST',
        body: credentials,
      });
      return res.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user);
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const res = await apiClient<AuthMeResponse>('/auth/register', {
        method: 'POST',
        body: data,
      });
      return res.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user);
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient('/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me, null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      // Saved plans belong to the account that just signed out.
      queryClient.removeQueries({ queryKey: queryKeys.trip.saved });
    },
  });

  const user = query.data ?? null;

  return {
    user,
    isLoading: query.isLoading,
    isError: query.isError,
    isAuthenticated: Boolean(user),
    isVerified: Boolean(user?.emailVerified),
    isAdmin: user?.role === 'ADMIN',
    refetch: query.refetch,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
