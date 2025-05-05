import {
  type Action,
  type ActionExample,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  composeContext,
  elizaLogger,
  generateObject,
} from "@elizaos/core";
import { z } from "zod";
import { poolProvider } from "../providers/poolInfo.ts";

const IncreaseLiquidityConfigSchema = z.object({
  stepPercentage: z.number(),
  addLiquidityAmount: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
});

export interface IncreaseLiquidityConfig extends Content {
  stepPercentage: string;
  addLiquidityAmount: string;
  minPrice: number;
  maxPrice: number;
}

interface ConfigRes {
  stepPercentage: number;
  addLiquidityAmount: number;
  minPrice: number;
  maxPrice: number;
}

export function isIncreaseLiquidityConfig(
  content: any
): content is IncreaseLiquidityConfig {
  elizaLogger.info("isIncreaseLiquidityConfig", content);
  return (
    typeof content.stepPercentage === "number" &&
    typeof content.addLiquidityAmount === "number" &&
    typeof content.minPrice === "number" &&
    typeof content.maxPrice === "number"
  );
}

const generatePoolConfigTemplate = `
You are a Raydium CLMM liquidity configuration generation AI assistant. Please help me generate the recommended configuration for adding liquidity.
I will provide you with the following information:

Pool current running parameters:
{{poolInfo}}

Wallet status of tokens held:
{{currentMsg}}

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
  "stepPercentage": 2,
  "addLiquidityAmount": 5,
  "minPrice": 10.2,
  "maxPrice": 12.2
}
\`\`\`

Explanation of the meaning of returning parameters:

1. ​**stepPercentage**​ (number):
   - This defines the percentage price change (from the last adjustment point) required to trigger another liquidity addition.
   - It should be determined based on market volatility:
     - For **highly volatile** pools: 3%–5% is preferred.
     - For **low volatility** pools: 8%–10% or higher may be appropriate.
   - Use smaller values for sensitive or short-term strategies.
   - Avoid always returning the same value. Adjust based on the poolInfo.

2. ​**pool_config.addLiquidityAmount**​ (number):
   - The fixed amount of tokens to add as liquidity each time the price trigger is met.
   - This should be a **reasonable fraction (like 5%~10%) of the user's current token balance**, considering that the balance needs to be preserved across multiple steps. Do NOT directly use the full wallet balance.
   - A higher value means more aggressive liquidity provision, while a lower value is more conservative.

3. ​**pool_config.minPrice**​ (number):
   - The minimum price threshold for the liquidity range.
   - When the market price falls below this value, the system may stop adding liquidity or adjust strategy.
   - Typically set based on historical price data and volatility analysis.

4. ​**pool_config.maxPrice**​ (number):
   - The maximum price threshold for the liquidity range.
   - When the market price rises above this value, the system may stop adding liquidity or adjust strategy.
   - Should be set to cover the expected price range where the token is most actively traded.
`;

export default {
  name: "GENERATE_RAYDIUM_CLMM_CONFIG",
  similes: ["CREATE_RAYDIUM_CLMM_CONFIG", "BUIDING_POOL_CONFIG"],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description:
    "Create a Raydium CLMM pool config like token amount and step of Ladder-Step LP. Requires user token held by amount.",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.info("Starting generate raydium clmm config");

    // Compose state if not provided
    elizaLogger.info("Message: ", JSON.stringify(message.content, null, 2));
    // elizaLogger.info("State: ", JSON.stringify(state, null, 2));

    if (!state) {
      elizaLogger.info("No state provided, composing state");

      state = (await runtime.composeState(message)) as State;
    } else {
      elizaLogger.info("State provided, updating recent message state");
      state = await runtime.updateRecentMessageState(state);
    }

    // parse wallet holding token
    state.currentMsg = message.content.text;

    // Get pool info for context
    const poolInfo = await poolProvider.get(runtime, message, state);
    elizaLogger.info("Pool info: ", JSON.stringify(poolInfo, null, 2));

    state.poolInfo = poolInfo;

    // Generate structured content from natural language
    const ctx = composeContext({
      state,
      template: generatePoolConfigTemplate,
    });

    // log the Template result
    elizaLogger.info("Template result: ", JSON.stringify(ctx, null, 2));

    const content = await generateObject({
      runtime,
      context: ctx,
      modelClass: ModelClass.LARGE,
      schema: IncreaseLiquidityConfigSchema,
    });

    // Validate the generated content
    // if (!isIncreaseLiquidityConfig(content)) {
    //   elizaLogger.error(
    //     "Invalid content for GENERATE_RAYDIUM_CLMM_CONFIG action."
    //   );
    //   return false;
    // }

    const { stepPercentage, addLiquidityAmount, minPrice, maxPrice } =
      content.object as ConfigRes;

    elizaLogger.info("Generated config: ", content.object);

    if (callback) {
      callback({
        text: `Configuration generated for Raydium CLMM pool.\n\nStep Percentage: ${stepPercentage}%\nLiquidity Amount: ${addLiquidityAmount}\nMin Price: ${minPrice}\nMax Price: ${maxPrice}`,
        content: {
          config: {
            stepPercentage,
            addLiquidityAmount,
            minPrice,
            maxPrice,
          },
        },
      });
    }

    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Generate a Raydium CLMM config for my TRUMP/SOL pool. My wallet has 1200 TRUMP and 0.32 SOL.",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Configuration generated for Raydium CLMM pool.\n\nStep Percentage: 5%\nLiquidity Amount: 5\nMin Price: 0.21\nMax Price: 0.32",
          action: "GENERATE_RAYDIUM_CLMM_CONFIG",
          content: {
            config: {
              stepPercentage: 5,
              addLiquidityAmount: 5,
              minPrice: 0.21,
              maxPrice: 0.32,
            },
          },
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
