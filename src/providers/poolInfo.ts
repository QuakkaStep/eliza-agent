import {
  IAgentRuntime,
  Memory,
  Provider,
  State,
  elizaLogger,
  getEnvVariable,
} from "@elizaos/core";
import NodeCache from "node-cache";
import { PoolMetric } from "../types";
import { retryableFetch, retryableRequest } from "../utils";

const DEFAULT_POOL_ID = "GQsPr4RJk9AZkkfWHud7v4MtotcxhaYzZHdsPCg9vNvW";

class DynamicPoolProviderService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 60 });
  }

  async getPoolInfoById(poolId: string): Promise<PoolMetric> {
    const cacheKey = `pool-info-${poolId}`;
    const cached = this.cache.get<PoolMetric>(cacheKey);
    if (cached) {
      elizaLogger.info(`Cache hit for pool id ${poolId} data`);
      return cached;
    }

    const baseUrl = getEnvVariable(
      "QUOKKA_STEP_BASE_URL",
      "http://localhost:3000"
    );

    const poolInfo = getEnvVariable(
      "QUOKKA_STEP_POOL_INFO",
      "pool-monitoring/info"
    );
    const url = `${baseUrl}/${poolInfo}?poolId=${poolId}`;
    elizaLogger.info(`get url from env: ${url}`);

    try {
      const response = await retryableFetch(url, {}, 3, 1500);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch pool info: ${response.status} ${response.statusText}`
        );
      }
      const json = await response.json();

      if (!json.data) {
        throw new Error("Invalid response format: missing 'data' field");
      }
      const data = json.data as PoolMetric;

      // 可选：验证数据结构是否符合预期
      if (!data.poolId || !data.tokenA || !data.tokenB || !data.price) {
        throw new Error("Invalid pool data: missing required fields");
      }

      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      elizaLogger.error(
        `Error fetching pool info for poolId ${poolId}: ${error}`
      );
      throw error; // 抛出错误以便上层处理
    }
  }

  formatPoolData(data: PoolMetric): string {
    return `Pool Info:
- Pool ID: ${data.poolId}
- Token A: ${data.tokenA.symbol} (${data.tokenA.mint})
- Token B: ${data.tokenB.symbol} (${data.tokenB.mint})
- Current Price: $${data.price}
- Mint Amount A: ${data.mintAmountA}
- Mint Amount B: ${data.mintAmountB}
- Fee Rate: ${data.feeRate * 100}%
- TVL: $${data.tvl}

24h Stats:
- Volume: $${data.volume24h}
- Volume Fee: $${data.volumeFee24h}
- APR: ${data.apr24h}%
- Price Range: $${data.priceMin24h} ~ $${data.priceMax24h}

7d Stats:
- Volume: $${data.volume7d}
- Volume Fee: $${data.volumeFee7d}
- APR: ${data.apr7d}%
- Price Range: $${data.priceMin7d} ~ $${data.priceMax7d}

30d Stats:
- Volume: $${data.volume30d}
- Volume Fee: $${data.volumeFee30d}
- APR: ${data.apr30d}%
- Price Range: $${data.priceMin30d} ~ $${data.priceMax30d}`;
  }
}

const poolProvider: Provider = {
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
  ): Promise<string | null> => {
    try {
      const poolId = runtime.getSetting("POOL_ID") || DEFAULT_POOL_ID;
      const fetcher = new DynamicPoolProviderService();
      const poolData = await fetcher.getPoolInfoById(poolId);
      return fetcher.formatPoolData(poolData);
    } catch (error) {
      elizaLogger.error(`Error in pool provider: ${error}`);
      return "Unable to fetch pool dynamic information.";
    }
  },
};

export { poolProvider };
