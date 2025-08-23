/**
 * Execution behavior of an order that can be sent to the engine:
 * - `default`: Limit order
 * - `ioc`: Immediate or Cancel order
 * - `fok`: Fill or Kill order
 * - `post_only`: Post Only order (will not match against existing orders)
 */
export type OrderExecutionType = 'default' | 'ioc' | 'fok' | 'post_only';
