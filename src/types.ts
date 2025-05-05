export interface PoolDynamicParams {
  poolId: string;
  tokenA: {
    symbol: string;
    mint: string;
    decimals: number;
  };
  tokenB: {
    symbol: string;
    mint: string;
    decimals: number;
  };
  price: number;
  mintAmountA: number;
  mintAmountB: number;
  feeRate: number;
  tvl: number;

  // 24h stats
  volume24h: number;
  volumeFee24h: number;
  apr24h: number;
  priceMin24h: number;
  priceMax24h: number;

  // 7d stats
  volume7d: number;
  volumeFee7d: number;
  apr7d: number;
  priceMin7d: number;
  priceMax7d: number;

  // 30d stats
  volume30d: number;
  volumeFee30d: number;
  apr30d: number;
  priceMin30d: number;
  priceMax30d: number;
}
