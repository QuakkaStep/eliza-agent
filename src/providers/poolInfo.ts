import {
  IAgentRuntime,
  Memory,
  Provider,
  State,
  elizaLogger,
} from "@elizaos/core";
import NodeCache from "node-cache";
import { PoolDynamicParams } from "../types";
import { retryableRequest } from "../utils";

const DEFAULT_POOL_ID = "GQsPr4RJk9AZkkfWHud7v4MtotcxhaYzZHdsPCg9vNvW";
const DYNAMIC_INFO_API = "http://localhost:3001/pool-monitoring/dynamic-info";

class DynamicPoolProviderService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 60 });
  }

  async getDynamicPoolData(poolId: string): Promise<PoolDynamicParams> {
    elizaLogger.info(
      "[getDynamicPoolData] Fetching dynamic pool data for pool ID:",
      poolId
    );
    const cacheKey = `dynamic-pool-${poolId}`;
    const cached = this.cache.get<PoolDynamicParams>(cacheKey);
    if (cached) {
      elizaLogger.info("Cache hit for dynamic pool data");
      return cached;
    }

    const url = `${DYNAMIC_INFO_API}?poolId=${poolId}`;

    // const response = await retryableRequest<PoolDynamicParams>({
    //   url,
    //   method: "GET",
    // });
    // this.cache.set(cacheKey, response.data);
    // return response.data;

    const response = await fetch(url);
    const json = await response.json();
    const data = json.data as PoolDynamicParams;

    this.cache.set(cacheKey, data);
    return data;
  }

  formatDynamicPoolData(data: PoolDynamicParams): string {
    return `Dynamic Pool Stats:
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
      const poolData = await fetcher.getDynamicPoolData(poolId);
      return fetcher.formatDynamicPoolData(poolData);
    } catch (error) {
      elizaLogger.error(`Error in pool provider: ${error}`);
      return "Unable to fetch pool dynamic information.";
    }
  },
};

export { poolProvider };
