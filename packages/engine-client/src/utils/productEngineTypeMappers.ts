import { ProductEngineType } from '@nadohq/contracts';
import { EngineServerProductType } from '../types';

export function mapProductEngineType(
  productEngineType: ProductEngineType,
): EngineServerProductType {
  switch (productEngineType) {
    case ProductEngineType.SPOT:
      return 'spot';
    case ProductEngineType.PERP:
      return 'perp';
  }
}

export function mapEngineServerProductType(
  productEngineServerType: EngineServerProductType,
): ProductEngineType {
  switch (productEngineServerType) {
    case 'spot':
      return ProductEngineType.SPOT;
    case 'perp':
      return ProductEngineType.PERP;
  }
}
