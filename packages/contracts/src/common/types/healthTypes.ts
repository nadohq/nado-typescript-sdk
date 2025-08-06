import { BigDecimal } from '@nadohq/utils';

export type HealthType = 'maintenance' | 'initial' | 'unweighted';

export interface HealthStatus {
  health: BigDecimal;
  assets: BigDecimal;
  liabilities: BigDecimal;
}

export type HealthStatusByType = Record<HealthType, HealthStatus>;

// Represents a "linked" pair of spot & perp product IDs used for spread health calculations
export interface HealthGroup {
  spotProductId: number;
  perpProductId: number;
}
