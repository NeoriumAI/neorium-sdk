import { z } from 'zod';

export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.string()
  })
});

export type ToolCall = z.infer<typeof ToolCallSchema>;
