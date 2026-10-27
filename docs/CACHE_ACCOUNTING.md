# Cache accounting — why `kappa stats` shows Cache Write = 0

Investigated 2026-10-20. Root cause traced from the `stats` CLI back to the
provider usage mapping on the estate's stack (kappa → herd/llama-swap,
OpenAI-compatible).

## The data flow

```
provider response ──► provider `usage` mapping ──► getUsage() ──► session token record ──► stats
```

1. **Provider response** — the estate gateway (herd/llama-swap, OpenAI-compatible)
   reports cache usage only as `usage.prompt_tokens_details.cached_tokens`
   (cache **read**). It does **not** emit a separate cache-write /
   cache-creation token count.

2. **Provider usage mapping** —
   `packages/opencode/src/provider/sdk/copilot/chat/openai-compatible-chat-language-model.ts:279-285`:

   ```ts
   usage: {
     inputTokens:          ...prompt_tokens,
     outputTokens:         ...completion_tokens,
     totalTokens:          ...total_tokens,
     reasoningTokens:      ...completion_tokens_details?.reasoning_tokens,
     cachedInputTokens:    ...prompt_tokens_details?.cached_tokens,   // READ
     // ── no cache-WRITE / cache-creation mapping exists here ──
   },
   ```

   The OpenAI-compatible provider hence surfaces `usage.cachedInputTokens`
   (read) but **never** `cacheWriteInputTokens`.

3. **Accounting** —
   `packages/opencode/src/session/index.ts:475-483` (`getUsage`) fills
   `tokens.cache.write` only from:

   ```ts
   input.metadata?.["anthropic"]?.["cacheCreationInputTokens"] ??
     input.metadata?.["bedrock"]?.["usage"]?.["cacheWriteInputTokens"] ??
     input.metadata?.["venice"]?.["usage"]?.["cacheCreationInputTokens"] ??
     0;
   ```

   All three keys are written by the Anthropic / Bedrock / Venice SDKs. The
   OpenAI-compatible provider sets **none of them**, so the fallback is `0`.
   (Cache **read** is read from `input.usage.cachedInputTokens`, which the
   OpenAI-compatible provider does set.)

4. **Session record** — `packages/opencode/src/session/processor.ts:259`
   forwards `cacheWriteTokens: usage.tokens.cache.write` into the message.

5. **Stats** — `packages/opencode/src/cli/cmd/stats.ts:227,233,253,360`
   sums `message.info.tokens.cache?.write` → prints `Cache Write 0`.

## Verdict

`cache.write = 0` is **expected and correct** on the estate stack:

- The gateway is OpenAI-compatible and reports cache only as
  `prompt_tokens_details.cached_tokens` (read).
- kappa's OpenAI-compatible provider maps read but has **no cache-write
  mapping**.
- `getUsage` only recognizes cache-write metadata from Anthropic / Bedrock /
  Venice SDKs, which never apply here.

Server-side prefix caching (llama-swap) means cache _writes_ are not billed
as a separate metered field — so `0` is not a regression, it is the honest
number for this provider.

## If you want a real number

Make cache-write visible end-to-end (all three steps required):

1. **Gateway:** return a cache-creation count, e.g.
   `usage.prompt_tokens_details` extension
   (`cache_creation_input_tokens`) or an OpenRouter-shaped
   `cache_creation_input_tokens` in `usage`.
2. **Provider:** in the OpenAI-compatible chat provider's `usage` mapping,
   add `cacheWriteInputTokens: responseBody.usage?.prompt_tokens_details?.cache_creation_input_tokens ?? ...`.
3. **getUsage:** in `session/index.ts:476-483`, read that surfaced field
   (or a `metadata.openrouter.cache_creation_input_tokens` key).

Without step 1 (the gateway actually returning the number) the rest yields
`0` regardless — which is the current, correct state.
