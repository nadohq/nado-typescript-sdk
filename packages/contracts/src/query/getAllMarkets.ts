import { removeDecimals, toBigDecimal } from '@nadohq/utils';
import { MarketWithProduct, ProductEngineType, WithContracts } from '../common';
import { mapContractPerpProduct, mapContractSpotProduct } from './utils';

export type GetAllMarketsResponse = MarketWithProduct[];

/**
 * Return all markets registered with the clearinghouse. Calls querier internally.
 * This also returns quote product with a zero market
 */
export async function getAllMarkets({
  querier,
}: WithContracts<unknown>): Promise<GetAllMarketsResponse> {
  const contractData = await querier.read.getAllProducts();
  const markets: MarketWithProduct[] = [];

  contractData.spotProducts.forEach((productInfo) => {
    markets.push({
      productId: Number(productInfo.productId),
      type: ProductEngineType.SPOT,
      product: mapContractSpotProduct(productInfo),
      minSize: toBigDecimal(productInfo.bookInfo.minSize),
      priceIncrement: removeDecimals(productInfo.bookInfo.priceIncrementX18),
      sizeIncrement: toBigDecimal(productInfo.bookInfo.sizeIncrement),
    });
  });

  contractData.perpProducts.forEach((productInfo) => {
    markets.push({
      productId: Number(productInfo.productId),
      type: ProductEngineType.PERP,
      product: mapContractPerpProduct(productInfo),
      minSize: toBigDecimal(productInfo.bookInfo.minSize),
      priceIncrement: removeDecimals(productInfo.bookInfo.priceIncrementX18),
      sizeIncrement: toBigDecimal(productInfo.bookInfo.sizeIncrement),
    });
  });

  return markets;
}
