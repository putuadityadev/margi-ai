import { useMutation } from '@tanstack/react-query';
import { ChatReplySchema, type ChatReply, type ChatRequest } from '@margi-ai/shared';
import { apiClient } from '../../lib/apiClient';

export function useChatReply() {
  return useMutation<ChatReply, Error, ChatRequest>({
    mutationFn: (request) =>
      apiClient('/chat/reply', { method: 'POST', body: request, schema: ChatReplySchema }),
  });
}
